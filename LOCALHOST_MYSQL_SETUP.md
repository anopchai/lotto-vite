# Localhost MySQL Setup for Lotto Vite System

## Prerequisites

1. MySQL 8.0+ installed and running on localhost
2. Access to MySQL root user or a user with CREATE DATABASE privileges

## Database Setup

### 1. Create Database

Connect to MySQL as root user and create the database:

```sql
CREATE DATABASE IF NOT EXISTS lotto_vite_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Import Schema

Import the database schema:

```bash
mysql -u root -p lotto_vite_system < database/schema.sql
```

When prompted, enter your MySQL root password.

### 3. Verify Database Structure

Connect to the database and verify the tables:

```sql
USE lotto_vite_system;

SHOW TABLES;

-- You should see:
-- tbl_agent
-- tbl_half_price_numbers
-- tbl_period
-- tbl_result
-- tbl_setting
-- tbl_ticket
-- tbl_winners
```

## Default User

The schema includes a default admin user:

- **Username**: ADMIN
- **Password**: (hashed in the schema - you'll need to reset it)

## Environment Configuration

Update the backend environment variables in `backend/.env`:

```
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=lotto_vite_system
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (change in production)
JWT_SECRET=lotto_vite_secret_key_2024_change_in_production

# CORS Origin
CORS_ORIGIN=http://localhost:5173
```

## Testing Database Connection

To test the database connection:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies if not already installed:
   ```bash
   npm install
   ```

3. Test the connection:
   ```bash
   node config/database.js
   ```

You should see:
```
✅ Database connected successfully
```

## Reset Admin Password (Optional)

If you need to reset the admin password:

```sql
USE lotto_vite_system;

-- Generate a bcrypt hash for your new password
-- You can use an online bcrypt generator or Node.js script

UPDATE tbl_agent 
SET password = '$2a$10$new_hashed_password_here' 
WHERE agent_code = 'ADMIN';
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure MySQL is running
   - Check that MySQL is listening on localhost:3306
   - Verify firewall settings

2. **Access Denied**
   - Check username and password
   - Ensure the user has proper privileges
   - Verify the database exists

3. **Character Set Issues**
   - Ensure the database is created with utf8mb4 charset
   - Check MySQL configuration for proper charset settings

### Checking MySQL Status

On Windows:
```bash
net start mysql
```

On macOS/Linux:
```bash
sudo systemctl status mysql
# or
brew services list | grep mysql
```

### Creating a Dedicated Database User (Recommended)

For better security, create a dedicated user for the application:

```sql
CREATE USER 'lotto_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON lotto_vite_system.* TO 'lotto_user'@'localhost';
FLUSH PRIVILEGES;
```

Then update your `.env` file:
```
DB_USER=lotto_user
DB_PASSWORD=strong_password_here
```