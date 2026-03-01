# Whiteboard Feature Implementation Plan for LumaLance

## Overview

This document outlines the implementation plan for adding a Miro-like whiteboard feature to the LumaLance platform. The whiteboard feature will allow users to:

- Create personal taskboards
- Share taskboards with other users on the platform
- View projects in both standard list view and canvas view
- Draw, add sticky notes, upload images, and embed videos
- Link whiteboard elements to database entities for alternative views

## Requirements Analysis

### Core Functionality

1. **Canvas / Whiteboard**
   - Zoomable, pannable infinite canvas
   - Grid system for alignment
   - Real-time collaboration capabilities

2. **Drawing Tools**
   - Freehand drawing tool
   - Shape tools (rectangle, circle, arrow, etc.)
   - Text tool
   - Eraser functionality
   - Color selection

3. **Content Elements**
   - Sticky notes (resizable, colorable)
   - Text blocks with rich formatting
   - Image uploads and embedding
   - Video embedding (YouTube, Vimeo)
   - Project cards linked to database

4. **User Interaction**
   - Drag and drop functionality
   - Resize and rotate elements
   - Copy/paste and duplicate
   - Undo/redo operations

5. **Sharing & Collaboration**
   - Permission levels (view, edit, admin)
   - Real-time updates between users
   - User presence indicators

6. **Project Integration**
   - View projects as cards on whiteboard
   - Link whiteboard elements to projects
   - Toggle between list view and canvas view

## Technical Architecture

### Database Schema Extensions

```sql
-- Whiteboards table
CREATE TABLE whiteboards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Whiteboard sharing permissions
CREATE TABLE whiteboard_collaborators (
  id SERIAL PRIMARY KEY,
  whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(whiteboard_id, user_id)
);

-- Whiteboard elements (shapes, stickies, text, images, etc.)
CREATE TABLE whiteboard_elements (
  id SERIAL PRIMARY KEY,
  whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'sticky', 'shape', 'text', 'image', 'link', 'project'
  content JSONB NOT NULL, -- Stores element-specific data
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT,
  height FLOAT,
  rotation FLOAT DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Project-whiteboard association (for linking projects to whiteboard elements)
CREATE TABLE project_whiteboards (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  whiteboard_element_id INTEGER NOT NULL REFERENCES whiteboard_elements(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, whiteboard_element_id)
);
```

### Element Content Structure (JSONB)

The `content` field in the `whiteboard_elements` table will use structured JSON data:

```javascript
// Sticky note
{
  text: "This is a sticky note",
  color: "#FFCC00",
  fontSize: 14
}

// Shape
{
  shapeType: "rectangle", // or "circle", "triangle", etc.
  strokeColor: "#000000",
  strokeWidth: 2,
  fillColor: "#FFFFFF"
}

// Text
{
  text: "This is a text block",
  fontSize: 16,
  fontFamily: "Arial",
  color: "#000000",
  bold: false,
  italic: false,
  underline: false
}

// Image
{
  url: "https://example.com/image.jpg",
  originalWidth: 800,
  originalHeight: 600,
  alt: "Description"
}

// Video
{
  type: "youtube", // or "vimeo", etc.
  videoId: "dQw4w9WgXcQ",
  startTime: 0
}

// Project link
{
  projectId: 123,
  displayMode: "card" // or "minimal"
}
```

## Backend Implementation

### API Routes

```javascript
// server/routes/whiteboards.js
const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all whiteboards for a user (including shared ones)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT w.*, 
        u.email as owner_email,
        pr.display_name as owner_display_name,
        pr.avatar_url as owner_avatar_url,
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE wc.permission_level
        END as permission_level
      FROM whiteboards w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.owner_id = $1 OR wc.user_id = $1
      ORDER BY w.updated_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting whiteboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific whiteboard with all its elements
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const permissionCheck = await query(`
      SELECT 
        CASE 
          WHEN w.owner_id = $1 THEN 'owner'
          ELSE COALESCE(wc.permission_level, 'none')
        END as permission_level
      FROM whiteboards w
      LEFT JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id AND wc.user_id = $1
      WHERE w.id = $2
    `, [req.user.id, id]);
    
    if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].permission_level === 'none') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get whiteboard details
    const whiteboardResult = await query(`
      SELECT w.*, 
        u.email as owner_email,
        pr.display_name as owner_display_name,
        pr.avatar_url as owner_avatar_url
      FROM whiteboards w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE w.id = $1
    `, [id]);
    
    // Get whiteboard elements
    const elementsResult = await query(`
      SELECT we.*, u.email as creator_email
      FROM whiteboard_elements we
      LEFT JOIN users u ON we.created_by = u.id
      WHERE we.whiteboard_id = $1
      ORDER BY we.z_index ASC
    `, [id]);
    
    // Get collaborators
    const collaboratorsResult = await query(`
      SELECT wc.*, 
        u.email,
        pr.display_name,
        pr.avatar_url
      FROM whiteboard_collaborators wc
      JOIN users u ON wc.user_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.user_id
      WHERE wc.whiteboard_id = $1
    `, [id]);
    
    res.json({
      ...whiteboardResult.rows[0],
      elements: elementsResult.rows,
      collaborators: collaboratorsResult.rows,
      current_user_permission: permissionCheck.rows[0].permission_level
    });
  } catch (error) {
    console.error('Error getting whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new whiteboard
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, is_public = false } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const result = await query(`
      INSERT INTO whiteboards (title, description, owner_id, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, description, req.user.id, is_public]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Additional routes for elements, sharing, etc.
// ...

module.exports = router;
```

### Real-time Collaboration with WebSockets

```javascript
// server/services/whiteboard-socket.js
const socketIo = require('socket.io');
const { verifyToken } = require('../middleware/auth');

const setupWhiteboardSockets = (server) => {
  const io = socketIo(server);
  
  // Whiteboard namespace
  const whiteboardIo = io.of('/whiteboard');
  
  // Authentication middleware
  whiteboardIo.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  whiteboardIo.on('connection', (socket) => {
    console.log(`User ${socket.user.id} connected to whiteboard socket`);
    
    // Handle join room
    socket.on('join-whiteboard', async (whiteboardId) => {
      // Check permissions
      // ...
      
      socket.join(`whiteboard-${whiteboardId}`);
      
      // Notify others of user joining
      socket.to(`whiteboard-${whiteboardId}`).emit('user-joined', {
        userId: socket.user.id,
        email: socket.user.email
      });
    });
    
    // Handle element creation
    socket.on('element-create', async (data) => {
      try {
        // Save to database
        // ...
        
        // Broadcast to others
        socket.to(`whiteboard-${data.whiteboardId}`).emit('element-created', {
          ...data,
          createdBy: socket.user.id
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to create element' });
      }
    });
    
    // Handle element updates
    socket.on('element-update', async (data) => {
      try {
        // Update in database
        // ...
        
        // Broadcast to others
        socket.to(`whiteboard-${data.whiteboardId}`).emit('element-updated', data);
      } catch (error) {
        socket.emit('error', { message: 'Failed to update element' });
      }
    });
    
    // Handle element deletion
    socket.on('element-delete', async (data) => {
      try {
        // Delete from database
        // ...
        
        // Broadcast to others
        socket.to(`whiteboard-${data.whiteboardId}`).emit('element-deleted', {
          elementId: data.elementId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete element' });
      }
    });
    
    // Handle cursor position updates
    socket.on('cursor-move', (data) => {
      socket.to(`whiteboard-${data.whiteboardId}`).emit('cursor-moved', {
        userId: socket.user.id,
        x: data.x,
        y: data.y
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} disconnected from whiteboard socket`);
      // Notify all rooms this user was in
    });
  });
  
  return whiteboardIo;
};

module.exports = setupWhiteboardSockets;
```

## Frontend Implementation

### Canvas Component

For the canvas implementation, we'll use Konva.js, a powerful HTML5 Canvas library that works well with React:

```tsx
// components/whiteboard/Canvas.tsx
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Image, Line, Circle, Group } from 'react-konva';
import { useWhiteboardSocket } from '@/hooks/use-whiteboard-socket';
import { WhiteboardElement } from '@/types/whiteboard';

interface CanvasProps {
  whiteboardId: string;
  elements: WhiteboardElement[];
  permission: 'view' | 'edit' | 'admin' | 'owner';
  onElementCreate: (element: Partial<WhiteboardElement>) => void;
  onElementUpdate: (elementId: number, updates: Partial<WhiteboardElement>) => void;
  onElementDelete: (elementId: number) => void;
}

export const WhiteboardCanvas = ({
  whiteboardId,
  elements,
  permission,
  onElementCreate,
  onElementUpdate,
  onElementDelete
}: CanvasProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tool, setTool] = useState<'select' | 'sticky' | 'shape' | 'text' | 'draw'>('select');
  const stageRef = useRef(null);
  const isDrawing = useRef(false);
  const [lines, setLines] = useState([]);
  
  const socket = useWhiteboardSocket(whiteboardId);
  
  useEffect(() => {
    // Set up socket listeners for real-time updates
    if (socket) {
      socket.on('element-created', (newElement) => {
        // Add new element from other users
      });
      
      socket.on('element-updated', (updatedElement) => {
        // Update element from other users
      });
      
      socket.on('element-deleted', ({ elementId }) => {
        // Remove element deleted by other users
      });
      
      socket.on('cursor-moved', ({ userId, x, y }) => {
        // Show other users' cursors
      });
    }
    
    return () => {
      if (socket) {
        socket.off('element-created');
        socket.off('element-updated');
        socket.off('element-deleted');
        socket.off('cursor-moved');
      }
    };
  }, [socket, whiteboardId]);
  
  // Handle zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    
    const pointerPosition = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointerPosition.x - stage.x()) / oldScale,
      y: (pointerPosition.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    setScale(newScale);
    setPosition({
      x: pointerPosition.x - mousePointTo.x * newScale,
      y: pointerPosition.y - mousePointTo.y * newScale,
    });
  };
  
  // Handle element selection
  const handleSelect = (id) => {
    setSelectedId(id);
  };
  
  // Handle drawing
  const handleMouseDown = (e) => {
    if (tool !== 'draw' || permission === 'view') return;
    
    isDrawing.current = true;
    const pos = stageRef.current.getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y] }]);
  };
  
  const handleMouseMove = (e) => {
    if (!isDrawing.current) {
      // Send cursor position to other users
      if (socket) {
        const pos = stageRef.current.getPointerPosition();
        socket.emit('cursor-move', {
          whiteboardId,
          x: pos.x,
          y: pos.y
        });
      }
      return;
    }
    
    const stage = stageRef.current;
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];
    
    // Add point to last line
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    // Replace last line
    setLines([...lines.slice(0, -1), lastLine]);
  };
  
  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    
    // Save the line as an element
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      onElementCreate({
        type: 'draw',
        content: {
          points: lastLine.points,
          strokeWidth: 2,
          strokeColor: '#000000'
        },
        position_x: 0,
        position_y: 0
      });
    }
  };
  
  // Render different element types
  const renderElement = (element) => {
    switch (element.type) {
      case 'sticky':
        return (
          <Group
            key={element.id}
            x={element.position_x}
            y={element.position_y}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
            draggable={permission !== 'view'}
            onClick={() => handleSelect(element.id)}
            onDragEnd={(e) => {
              onElementUpdate(element.id, {
                position_x: e.target.x(),
                position_y: e.target.y()
              });
            }}
          >
            <Rect
              width={element.width}
              height={element.height}
              fill={element.content.color || '#FFCC00'}
              shadowBlur={selectedId === element.id ? 10 : 0}
              cornerRadius={5}
            />
            <Text
              text={element.content.text}
              width={element.width - 20}
              height={element.height - 20}
              x={10}
              y={10}
              fontSize={element.content.fontSize || 14}
              wrap="word"
            />
          </Group>
        );
      
      case 'shape':
        // Render different shapes based on content.shapeType
        // ...
        
      case 'text':
        // Render text element
        // ...
        
      case 'image':
        // Render image element
        // ...
        
      case 'project':
        // Render project card
        // ...
        
      case 'draw':
        // Render line drawing
        return (
          <Line
            key={element.id}
            points={element.content.points}
            stroke={element.content.strokeColor || '#000000'}
            strokeWidth={element.content.strokeWidth || 2}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            onClick={() => handleSelect(element.id)}
            draggable={permission !== 'view'}
            onDragEnd={(e) => {
              onElementUpdate(element.id, {
                position_x: e.target.x(),
                position_y: e.target.y()
              });
            }}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="whiteboard-canvas">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Grid Layer */}
        <Layer>
          {/* Render grid lines */}
        </Layer>
        
        {/* Content Layer */}
        <Layer>
          {elements.map(renderElement)}
          
          {/* Render temporary lines while drawing */}
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="#000000"
              strokeWidth={2}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
        
        {/* UI Layer (selection handles, etc.) */}
        <Layer>
          {/* Render selection handles if an element is selected */}
        </Layer>
      </Stage>
    </div>
  );
};
```

### Whiteboard Tools Panel

```tsx
// components/whiteboard/ToolPanel.tsx
import { useState } from 'react';

interface ToolPanelProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onAddSticky: () => void;
  onAddText: () => void;
  onAddShape: (shape: string) => void;
  onAddImage: () => void;
  onAddProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ToolPanel = ({
  activeTool,
  onToolChange,
  onColorChange,
  onAddSticky,
  onAddText,
  onAddShape,
  onAddImage,
  onAddProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: ToolPanelProps) => {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
  ];
  
  const shapes = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'circle', label: 'Circle' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'line', label: 'Line' },
    { id: 'arrow', label: 'Arrow' }
  ];
  
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    onColorChange(color);
  };
  
  const handleShapeSelect = (shape) => {
    onAddShape(shape);
    setShowShapeMenu(false);
  };
  
  return (
    <div className="whiteboard-tool-panel">
      <div className="tool-section">
        <button
          className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => onToolChange('select')}
          title="Select"
        >
          <i className="icon-cursor" />
        </button>
        
        <button
          className={`tool-button ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => onToolChange('draw')}
          title="Draw"
        >
          <i className="icon-pen" />
        </button>
        
        <div className="tool-dropdown">
          <button
            className="tool-button"
            onClick={() => setShowShapeMenu(!showShapeMenu)}
            title="Add Shape"
          >
            <i className="icon-shape" />
          </button>
          
          {showShapeMenu && (
            <div className="dropdown-menu">
              {shapes.map((shape) => (
                <button
                  key={shape.id}
                  className="dropdown-item"
                  onClick={() => handleShapeSelect(shape.id)}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          className="tool-button"
          onClick={onAddSticky}
          title="Add Sticky Note"
        >
          <i className="icon-sticky-note" />
        </button>
        
        <button
          className="tool-button"
          onClick={onAddText}
          title="Add Text"
        >
          <i className="icon-text" />
        </button>
        
        <button
          className="tool-button"
          onClick={onAddImage}
          title="Add Image"
        >
          <i className="icon-image" />
        </button>
        
        <button
          className="tool-button"
          onClick={onAddProject}
          title="Add Project Card"
        >
          <i className="icon-project" />
        </button>
      </div>
      
      <div className="tool-section">
        <div className="color-picker">
          {colors.map((color) => (
            <button
              key={color}
              className={`color-swatch ${color === selectedColor ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={color}
            />
          ))}
        </div>
      </div>
      
      <div className="tool-section">
        <button
          className="tool-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <i className="icon-undo" />
        </button>
        
        <button
          className="tool-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <i className="icon-redo" />
        </button>
      </div>
    </div>
  );
};
```

### Project Integration

```tsx
// components/whiteboard/ProjectElement.tsx
import { useState, useEffect } from 'react';
import { Group, Rect, Text, Image } from 'react-konva';
import { useImage } from 'react-konva-utils';

interface ProjectElementProps {
  project: any;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  isEditable: boolean;
}

export const ProjectElement = ({
  project,
  x,
  y,
  width,
  height,
  isSelected,
  onSelect,
  onUpdate,
  isEditable
}: ProjectElementProps) => {
  const [image] = useImage(project.client_avatar_url || '/placeholder-user.jpg');
  
  return (
    <Group
      x={x}
      y={y}
      width={width}
      height={height}
      draggable={isEditable}
      onClick={onSelect}
      onDragEnd={(e) => {
        onUpdate({
          position_x: e.target.x(),
          position_y: e.target.y()
        });
      }}
    >
      {/* Card background */}
      <Rect
        width={width}
        height={height}
        fill="#FFFFFF"
        stroke="#CCCCCC"
        strokeWidth={1}
        shadowBlur={isSelected ? 10 : 3}
        shadowColor={isSelected ? "#0066FF" : "#CCCCCC"}
        cornerRadius={5}
      />
      
      {/* Project title */}
      <Text
        text={project.title}
        width={width - 20}
        height={30}
        x={10}
        y={10}
        fontSize={16}
        fontStyle="bold"
        fill="#333333"
        ellipsis={true}
      />
      
      {/* Client avatar */}
      <Image
        image={image}
        x={10}
        y={50}
        width={40}
        height={40}
        cornerRadius={20}
      />
      
      {/* Client name */}
      <Text
        text={project.client_display_name || project.client_email}
        x={60}
        y={55}
        width={width - 70}
        fontSize={14}
        fill="#666666"
      />
      
      {/* Project description */}
      <Text
        text={project.description ? project.description.substring(0, 100) + (project.description.length > 100 ? '...' : '') : ''}
        x={10}
        y={100}
        width={width - 20}
        height={height - 150}
        fontSize={12}
        fill="#666666"
        wrap="word"
      />
      
      {/* Project meta */}
      <Rect
        x={0}
        y={height - 40}
        width={width}
        height={40}
        fill="#F5F5F5"
        cornerRadius={[0, 0, 5, 5]}
      />
      
      <Text
        text={`Budget: $${project.budget || 'N/A'}`}
        x={10}
        y={height - 30}
        fontSize={12}
        fill="#666666"
      />
      
      <Text
        text={`Status: ${project.status}`}
        x={width / 2}
        y={height - 30}
        fontSize={12}
        fill="#666666"
      />
    </Group>
  );
};
```

### Whiteboard Page

```tsx
// app/dashboard/whiteboards/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WhiteboardCanvas } from '@/components/whiteboard/Canvas';
import { ToolPanel } from '@/components/whiteboard/ToolPanel';
import { SharePanel } from '@/components/whiteboard/SharePanel';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/
