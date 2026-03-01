const express = require('express');
const { query, transaction } = require('../database/connection');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   GET /api/payments
 * @desc    Get payments for the authenticated user (as payer or payee)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, type = 'all', limit = 20, offset = 0 } = req.query;
    
    let sql = `
      SELECT p.*, 
        m.title as milestone_title,
        m.description as milestone_description,
        pr.title as project_title,
        pr.slug as project_slug,
        payer.display_name as payer_name,
        payer.avatar_url as payer_avatar,
        payee.display_name as payee_name,
        payee.avatar_url as payee_avatar
      FROM payments p
      JOIN milestones m ON p.milestone_id = m.id
      JOIN projects pr ON m.project_id = pr.id
      JOIN profiles payer ON p.payer_id = payer.user_id
      JOIN profiles payee ON p.payee_id = payee.user_id
      WHERE (p.payer_id = $1 OR p.payee_id = $1)
    `;
    
    const queryParams = [req.user.id];
    let paramIndex = 2;
    
    // Filter by type (sent/received)
    if (type === 'sent') {
      sql += ` AND p.payer_id = $${paramIndex++}`;
      queryParams.push(req.user.id);
    } else if (type === 'received') {
      sql += ` AND p.payee_id = $${paramIndex++}`;
      queryParams.push(req.user.id);
    }
    
    // Filter by status
    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }
    
    // Add sorting and pagination
    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const result = await query(sql, queryParams);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM payments 
      WHERE (payer_id = $1 OR payee_id = $1)
    `;
    const countParams = [req.user.id];
    let countParamIndex = 2;
    
    if (type === 'sent') {
      countSql += ` AND payer_id = $${countParamIndex++}`;
      countParams.push(req.user.id);
    } else if (type === 'received') {
      countSql += ` AND payee_id = $${countParamIndex++}`;
      countParams.push(req.user.id);
    }
    
    if (status) {
      countSql += ` AND status = $${countParamIndex++}`;
      countParams.push(status);
    }
    
    const countResult = await query(countSql, countParams);
    
    res.json({
      payments: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/payments/:id
 * @desc    Get a specific payment by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT p.*, 
        m.title as milestone_title,
        m.description as milestone_description,
        pr.title as project_title,
        pr.slug as project_slug,
        payer.display_name as payer_name,
        payer.avatar_url as payer_avatar,
        payee.display_name as payee_name,
        payee.avatar_url as payee_avatar,
        pm.name as payment_method_name,
        pm.type as payment_method_type
      FROM payments p
      JOIN milestones m ON p.milestone_id = m.id
      JOIN projects pr ON m.project_id = pr.id
      JOIN profiles payer ON p.payer_id = payer.user_id
      JOIN profiles payee ON p.payee_id = payee.user_id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.id = $1 AND (p.payer_id = $2 OR p.payee_id = $2)
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Get payment history
    const historyResult = await query(`
      SELECT ph.*, u.email as changed_by_email, p.display_name as changed_by_name
      FROM payment_history ph
      LEFT JOIN users u ON ph.changed_by = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE ph.payment_id = $1
      ORDER BY ph.created_at DESC
    `, [id]);
    
    res.json({
      payment: result.rows[0],
      history: historyResult.rows
    });
  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/payments/:id/status
 * @desc    Update payment status (mark as paid, cancelled, etc.)
 * @access  Private
 */
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, payment_method_id, transaction_id } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'due', 'paid', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if user can update this payment
    const paymentCheck = await query(
      'SELECT * FROM payments WHERE id = $1 AND (payer_id = $2 OR payee_id = $2)',
      [id, req.user.id]
    );
    
    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    const payment = paymentCheck.rows[0];
    
    // Update payment status using transaction
    const result = await transaction(async (client) => {
      // Update payment
      const updateResult = await client.query(`
        UPDATE payments 
        SET status = $1, 
            notes = $2,
            payment_method_id = $3,
            transaction_id = $4,
            paid_at = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [status, notes, payment_method_id, transaction_id, id]);
      
      // Add to payment history
      await client.query(`
        INSERT INTO payment_history (payment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, payment.status, status, req.user.id, notes]);
      
      return updateResult.rows[0];
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/payments/milestone/:milestoneId
 * @desc    Get payment for a specific milestone
 * @access  Private
 */
router.get('/milestone/:milestoneId', auth, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    
    const result = await query(`
      SELECT p.*, 
        m.title as milestone_title,
        pr.title as project_title,
        payer.display_name as payer_name,
        payee.display_name as payee_name
      FROM payments p
      JOIN milestones m ON p.milestone_id = m.id
      JOIN projects pr ON m.project_id = pr.id
      JOIN profiles payer ON p.payer_id = payer.user_id
      JOIN profiles payee ON p.payee_id = payee.user_id
      WHERE p.milestone_id = $1 AND (p.payer_id = $2 OR p.payee_id = $2)
    `, [milestoneId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found for this milestone' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting milestone payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN status = 'due' THEN 1 END) as due_payments,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'due' THEN amount ELSE 0 END) as total_due,
        SUM(CASE WHEN payee_id = $1 AND status = 'paid' THEN amount ELSE 0 END) as total_received,
        SUM(CASE WHEN payer_id = $1 AND status = 'paid' THEN amount ELSE 0 END) as total_sent
      FROM payments 
      WHERE payer_id = $1 OR payee_id = $1
    `, [req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/payment-methods
 * @desc    Get payment methods for the authenticated user
 * @access  Private
 */
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM payment_methods WHERE user_id = $1 AND is_active = true ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    
    res.json({ payment_methods: result.rows });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/payment-methods
 * @desc    Create a new payment method
 * @access  Private
 */
router.post('/payment-methods', auth, async (req, res) => {
  try {
    const { type, name, details, is_default } = req.body;
    
    // Validate required fields
    if (!type || !name) {
      return res.status(400).json({ message: 'Type and name are required' });
    }
    
    // If this is set as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
        [req.user.id]
      );
    }
    
    const result = await query(`
      INSERT INTO payment_methods (user_id, type, name, details, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, type, name, details, is_default || false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/payment-methods/:id
 * @desc    Update a payment method
 * @access  Private
 */
router.put('/payment-methods/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, details, is_default, is_active } = req.body;
    
    // Check if payment method belongs to user
    const checkResult = await query(
      'SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    // If this is set as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE payment_methods SET is_default = false WHERE user_id = $1 AND id != $2',
        [req.user.id, id]
      );
    }
    
    const result = await query(`
      UPDATE payment_methods 
      SET type = $1, name = $2, details = $3, is_default = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [type, name, details, is_default, is_active, id, req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/payment-methods/:id
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete('/payment-methods/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM payment_methods WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 