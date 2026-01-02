const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');

// GET user orders
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    try {
        const [orders] = await pool.execute(
            `SELECT o.*, 
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', oi.id,
                            'band_id', oi.band_id,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'band_name', b.name,
                            'band_image', b.image_url,
                            'band_color', b.color
                        )
                    ) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN bands b ON oi.band_id = b.id
             WHERE o.user_id = ?
             GROUP BY o.id
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );
        
        const parsedOrders = orders.map(order => ({
            ...order,
            items: order.items ? JSON.parse(order.items) : [],
            total_amount: parseFloat(order.total_amount),
            shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
            billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
        }));
        
        // Get total count for pagination
        const [totalRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            data: parsedOrders,
            pagination: {
                total: totalRows[0].count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parsedOrders.length === parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// GET single order
router.get('/:orderNumber', async (req, res) => {
    const { orderNumber } = req.params;
    
    try {
        const [orders] = await pool.execute(
            `SELECT o.*, 
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', oi.id,
                            'band_id', oi.band_id,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'band_name', b.name,
                            'band_description', b.description,
                            'band_image', b.image_url,
                            'band_color', b.color,
                            'band_material', b.material
                        )
                    ) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN bands b ON oi.band_id = b.id
             WHERE o.order_number = ?
             GROUP BY o.id`,
            [orderNumber]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        const order = orders[0];
        const parsedOrder = {
            ...order,
            items: order.items ? JSON.parse(order.items) : [],
            total_amount: parseFloat(order.total_amount),
            shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
            billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
        };
        
        res.json({
            success: true,
            data: parsedOrder
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
});

// POST create new order
router.post('/', async (req, res) => {
    const {
        userId,
        cartId,
        shippingAddress,
        billingAddress,
        paymentMethod,
        notes
    } = req.body;
    
    // Validation
    if (!cartId || !shippingAddress) {
        return res.status(400).json({
            success: false,
            error: 'Cart ID and shipping address are required'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get cart items with current prices
            const [cartItems] = await connection.execute(
                `SELECT ci.*, b.price as current_price, b.name, b.stock
                 FROM cart_items ci
                 JOIN bands b ON ci.band_id = b.id
                 WHERE ci.cart_id = ? AND b.active = 1`,
                [cartId]
            );
            
            if (cartItems.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Cart is empty'
                });
            }
            
            // Check stock availability
            for (const item of cartItems) {
                if (item.stock < item.quantity) {
                    await connection.rollback();
                    connection.release();
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient stock for ${item.name}. Only ${item.stock} available.`
                    });
                }
            }
            
            // Calculate total
            const totalAmount = cartItems.reduce((total, item) => {
                return total + (parseFloat(item.current_price) * item.quantity);
            }, 0);
            
            // Generate order number
            const orderNumber = `PU-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            
            // Create order
            const [orderResult] = await connection.execute(
                `INSERT INTO orders (order_number, user_id, total_amount, shipping_address, billing_address, payment_method, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderNumber,
                    userId || null,
                    totalAmount.toFixed(2),
                    JSON.stringify(shippingAddress),
                    billingAddress ? JSON.stringify(billingAddress) : JSON.stringify(shippingAddress),
                    paymentMethod || 'credit_card',
                    notes || null
                ]
            );
            
            const orderId = orderResult.insertId;
            
            // Create order items and update stock
            for (const item of cartItems) {
                // Add order item
                await connection.execute(
                    `INSERT INTO order_items (order_id, band_id, quantity, unit_price)
                     VALUES (?, ?, ?, ?)`,
                    [orderId, item.band_id, item.quantity, item.current_price]
                );
                
                // Update band stock
                await connection.execute(
                    'UPDATE bands SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.band_id]
                );
            }
            
            // Clear cart
            await connection.execute(
                'DELETE FROM cart_items WHERE cart_id = ?',
                [cartId]
            );
            
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [cartId]
            );
            
            await connection.commit();
            connection.release();
            
            // Get the complete order details
            const [newOrder] = await connection.execute(
                `SELECT o.*, 
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id', oi.id,
                                'band_id', oi.band_id,
                                'quantity', oi.quantity,
                                'unit_price', oi.unit_price,
                                'band_name', b.name,
                                'band_image', b.image_url,
                                'band_color', b.color
                            )
                        ) as items
                 FROM orders o
                 LEFT JOIN order_items oi ON o.id = oi.order_id
                 LEFT JOIN bands b ON oi.band_id = b.id
                 WHERE o.id = ?
                 GROUP BY o.id`,
                [orderId]
            );
            
            const order = newOrder[0];
            const parsedOrder = {
                ...order,
                items: order.items ? JSON.parse(order.items) : [],
                total_amount: parseFloat(order.total_amount),
                shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
                billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
            };
            
            // In production, you would:
            // 1. Process payment
            // 2. Send confirmation email
            // 3. Update inventory systems
            
            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    order: parsedOrder,
                    orderNumber,
                    orderId
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// PUT update order status (admin only)
router.put('/:orderNumber/status', async (req, res) => {
    const { orderNumber } = req.params;
    const { status, trackingNumber, notes } = req.body;
    
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    if (!status) {
        return res.status(400).json({
            success: false,
            error: 'Status is required'
        });
    }
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }
    
    try {
        const updates = ['status = ?'];
        const values = [status];
        
        if (trackingNumber) {
            updates.push('tracking_number = ?');
            values.push(trackingNumber);
        }
        
        if (notes) {
            updates.push('admin_notes = ?');
            values.push(notes);
        }
        
        values.push(orderNumber);
        
        await pool.execute(
            `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?`,
            values
        );
        
        // Get updated order
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE order_number = ?',
            [orderNumber]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: {
                ...orders[0],
                total_amount: parseFloat(orders[0].total_amount)
            }
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// GET order statistics
router.get('/stats/overview', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        // Get counts by status
        const [statusCounts] = await pool.execute(
            `SELECT status, COUNT(*) as count 
             FROM orders 
             GROUP BY status 
             ORDER BY FIELD(status, 'pending', 'processing', 'shipped', 'delivered', 'cancelled')`
        );
        
        // Get total revenue
        const [revenue] = await pool.execute(
            `SELECT 
                SUM(total_amount) as total_revenue,
                SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_revenue,
                COUNT(*) as total_orders,
                AVG(total_amount) as average_order_value
             FROM orders`
        );
        
        // Get recent orders
        const [recentOrders] = await pool.execute(
            `SELECT order_number, total_amount, status, created_at 
             FROM orders 
             ORDER BY created_at DESC 
             LIMIT 10`
        );
        
        // Get monthly revenue
        const [monthlyRevenue] = await pool.execute(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(total_amount) as revenue,
                COUNT(*) as orders
             FROM orders 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month DESC`
        );
        
        res.json({
            success: true,
            data: {
                statusCounts,
                revenue: {
                    total: parseFloat(revenue[0].total_revenue || 0).toFixed(2),
                    delivered: parseFloat(revenue[0].delivered_revenue || 0).toFixed(2),
                    averageOrderValue: parseFloat(revenue[0].average_order_value || 0).toFixed(2),
                    totalOrders: revenue[0].total_orders
                },
                recentOrders: recentOrders.map(order => ({
                    ...order,
                    total_amount: parseFloat(order.total_amount)
                })),
                monthlyRevenue: monthlyRevenue.map(month => ({
                    ...month,
                    revenue: parseFloat(month.revenue || 0).toFixed(2)
                }))
            }
        });
        
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order statistics'
        });
    }
});

// POST cancel order
router.post('/:orderNumber/cancel', async (req, res) => {
    const { orderNumber } = req.params;
    const { reason } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get order details
            const [orders] = await connection.execute(
                'SELECT id, status FROM orders WHERE order_number = ?',
                [orderNumber]
            );
            
            if (orders.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
            const order = orders[0];
            
            // Check if order can be cancelled
            if (order.status === 'cancelled') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Order is already cancelled'
                });
            }
            
            if (order.status === 'delivered') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'Delivered orders cannot be cancelled'
                });
            }
            
            // Get order items to restore stock
            const [orderItems] = await connection.execute(
                'SELECT band_id, quantity FROM order_items WHERE order_id = ?',
                [order.id]
            );
            
            // Restore stock for each item
            for (const item of orderItems) {
                await connection.execute(
                    'UPDATE bands SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.band_id]
                );
            }
            
            // Update order status
            await connection.execute(
                `UPDATE orders 
                 SET status = 'cancelled', 
                     cancellation_reason = ?,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [reason || 'Customer request', order.id]
            );
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: 'Order cancelled successfully'
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel order'
        });
    }
});

module.exports = router;