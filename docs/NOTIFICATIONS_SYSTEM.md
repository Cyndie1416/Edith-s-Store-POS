# Database-Based Notification System

## Overview

The notification system has been upgraded from localStorage-based to database-based, providing real-time, accurate notifications based on actual data from the POS system.

## Features

### Real-Time Notifications
- **Low Stock Alerts**: Automatically generated when products fall below minimum stock levels
- **Sales Notifications**: Created when new sales are completed
- **System Notifications**: For system events and updates

### Database Storage
- All notifications are stored in the `notifications` table
- Persistent across sessions and server restarts
- Support for user-specific notifications
- Reference tracking for related entities (products, sales, etc.)

## Database Schema

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                    -- 'lowStock', 'sales', 'system'
  title TEXT NOT NULL,                   -- Notification title
  message TEXT NOT NULL,                 -- Notification message
  priority TEXT DEFAULT 'medium',        -- 'low', 'medium', 'high'
  read_status BOOLEAN DEFAULT 0,         -- 0 = unread, 1 = read
  user_id INTEGER,                       -- Optional user-specific notification
  reference_id INTEGER,                  -- ID of related entity
  reference_type TEXT,                   -- Type of related entity ('product', 'sale', etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## API Endpoints

### Get Notifications
```
GET /api/notifications
Query Parameters:
- user_id: Filter by user
- limit: Number of notifications to return (default: 50)
- offset: Pagination offset (default: 0)
- unread_only: Filter unread notifications only
```

### Get Unread Count
```
GET /api/notifications/unread-count
Query Parameters:
- user_id: Filter by user
```

### Create Notification
```
POST /api/notifications
Body:
{
  "type": "lowStock|sales|system",
  "title": "Notification Title",
  "message": "Notification message",
  "priority": "low|medium|high",
  "user_id": 1, // optional
  "reference_id": 123, // optional
  "reference_type": "product" // optional
}
```

### Mark as Read
```
PATCH /api/notifications/:id/read
```

### Mark All as Read
```
PATCH /api/notifications/mark-all-read
Body:
{
  "user_id": 1 // optional
}
```

### Delete Notification
```
DELETE /api/notifications/:id
```

### Clear All Notifications
```
DELETE /api/notifications
Query Parameters:
- user_id: Filter by user
```

### Generate Low Stock Notifications
```
POST /api/notifications/generate-low-stock
```
Automatically checks all products and creates notifications for those below minimum stock levels.

## Automatic Notification Generation

### Low Stock Notifications
- **Triggered by**: Inventory adjustments, periodic checks
- **Generated when**: Product stock ≤ minimum stock level
- **Priority**: High if stock = 0, Medium otherwise

### Sales Notifications
- **Triggered by**: New sale completion
- **Generated when**: Sale is successfully created
- **Priority**: Medium

### System Notifications
- **Triggered by**: System events
- **Generated when**: Manual creation or system events
- **Priority**: Configurable

## Frontend Integration

### NotificationContext Updates
The `NotificationContext` has been updated to:
- Fetch notifications from the database instead of localStorage
- Poll for new notifications every 30 seconds
- Generate low stock notifications every 5 minutes
- Handle real-time updates

### Key Changes
1. **Database Integration**: All CRUD operations now use API calls
2. **Real-time Polling**: Automatic refresh of notifications
3. **Automatic Generation**: Low stock notifications generated periodically
4. **Error Handling**: Graceful fallback if notifications fail

## Usage Examples

### Creating a System Notification
```javascript
import { useNotifications } from '../contexts/NotificationContext';

const { addNotification } = useNotifications();

// Create a system notification
addNotification({
  type: 'system',
  title: 'System Update',
  message: 'Database backup completed successfully',
  priority: 'low'
});
```

### Checking for Low Stock
```javascript
// This happens automatically every 5 minutes
// Manual trigger via API:
fetch('/api/notifications/generate-low-stock', {
  method: 'POST'
});
```

## Configuration

### Notification Settings
Settings are still stored in localStorage for user preferences:
- `lowStock`: Enable/disable low stock notifications
- `sales`: Enable/disable sales notifications  
- `system`: Enable/disable system notifications
- `sound`: Enable/disable sound alerts
- `desktop`: Enable/disable desktop notifications

### Polling Intervals
- **Notification Polling**: 30 seconds
- **Low Stock Check**: 5 minutes
- **Desktop Notification Permission**: Requested on first use

## Benefits

1. **Real-time Accuracy**: Notifications based on actual database state
2. **Persistence**: Notifications survive server restarts
3. **Scalability**: Database storage supports multiple users
4. **Reference Tracking**: Link notifications to specific entities
5. **User-specific**: Support for user-targeted notifications
6. **Automatic Generation**: No manual intervention required

## Migration Notes

- Existing localStorage notifications are no longer used
- New notifications are automatically generated from database
- Settings are preserved in localStorage
- No data migration required - fresh start with database
