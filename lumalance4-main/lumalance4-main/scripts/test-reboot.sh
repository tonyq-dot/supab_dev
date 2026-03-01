#!/bin/bash

# Test script to verify reboot configuration
echo "=== LumaLance Reboot Configuration Test ==="
echo "Date: $(date)"
echo ""

# Check nginx status
echo "1. Checking Nginx status..."
if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx is running"
else
    echo "   ❌ Nginx is not running"
fi

if sudo systemctl is-enabled --quiet nginx; then
    echo "   ✅ Nginx is enabled for auto-start"
else
    echo "   ❌ Nginx is not enabled for auto-start"
fi

# Check PM2 status
echo ""
echo "2. Checking PM2 status..."
if pm2 ping > /dev/null 2>&1; then
    echo "   ✅ PM2 daemon is running"
else
    echo "   ❌ PM2 daemon is not running"
fi

if sudo systemctl is-enabled --quiet pm2-tq; then
    echo "   ✅ PM2 service is enabled for auto-start"
else
    echo "   ❌ PM2 service is not enabled for auto-start"
fi

# Check PM2 processes
echo ""
echo "3. Checking PM2 processes..."
pm2 status

# Test frontend
echo ""
echo "4. Testing frontend..."
if curl -s -o /dev/null -w "%{http_code}" -k https://lumalance.xyz | grep -q "200"; then
    echo "   ✅ Frontend is accessible (200 OK)"
else
    echo "   ❌ Frontend is not accessible"
fi

# Test backend API
echo ""
echo "5. Testing backend API..."
if curl -s -o /dev/null -w "%{http_code}" -k https://lumalance.xyz/api/health | grep -q "200"; then
    echo "   ✅ Backend API is accessible (200 OK)"
else
    echo "   ❌ Backend API is not accessible"
fi

# Check ports
echo ""
echo "6. Checking ports..."
if lsof -i :4420 > /dev/null 2>&1; then
    echo "   ✅ Port 4420 (backend) is in use"
else
    echo "   ❌ Port 4420 (backend) is not in use"
fi

# Check PM2 process details
echo ""
echo "7. Checking PM2 process details..."
pm2 show lumalance-app | grep -E "(status|memory|cpu|restarts)"

echo ""
echo "=== Test Complete ==="
echo "If all checks show ✅, the system is ready for reboot testing."
echo "After reboot, run this script again to verify auto-start works." 