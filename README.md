# Sanchez Rental System

A desktop rental management system built with Electron, React, and MySQL.

## Prerequisites

- **Node.js** (v16 or higher)
- **MySQL Server** (via XAMPP or standalone)
- **XAMPP** (recommended for easy MySQL setup)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up MySQL Database

#### Using XAMPP (Recommended):
1. Download and install XAMPP from [apachefriends.org](https://www.apachefriends.org/)
2. Launch XAMPP Control Panel
3. Start the **MySQL** service
4. Click "Admin" next to MySQL to open phpMyAdmin
5. Create a new database named `rental_system` (optional - the app will create it automatically)

#### Alternative: Standalone MySQL
Install MySQL server and create the database manually.

### 3. Configure Database Connection

The app uses environment variables for database configuration. Copy `.env` file and modify as needed:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rental_system
DB_PORT=3306

# Application Environment
NODE_ENV=development
```

### 4. Run the Application

#### Development Mode:
```bash
npm run electron-dev
```

#### Production Build:
```bash
npm run electron-pack
```

## Database Schema

The application automatically creates the following tables:
- `users` - User authentication
- `clients` - Client information
- `equipment` - Equipment inventory
- `rentals` - Rental transactions
- `returns` - Return records
- `payments` - Payment records
- `audit_logs` - System audit trail

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

## Features

- Client management
- Equipment inventory tracking
- Rental processing
- Return handling
- Payment management
- Reports and analytics
- User authentication

## Deployment

For deployment, ensure MySQL is running on the target system and update the `.env` file with the appropriate database credentials. The application will automatically create the database and tables on first run.

## Troubleshooting

- **Database Connection Issues**: Ensure MySQL is running and credentials are correct
- **Port Conflicts**: If port 3306 is in use, change the DB_PORT in .env
- **Permission Issues**: Make sure the MySQL user has proper permissions

## Technologies Used

- **Frontend**: React, Tailwind CSS
- **Backend**: Electron (Node.js)
- **Database**: MySQL
- **Build Tool**: Electron Builder
