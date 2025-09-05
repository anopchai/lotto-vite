# Lotto Vite System - Docker + Ngrok Deployment

This deployment setup allows you to run the Lotto Vite System using Docker containers with public access via ngrok.

## Prerequisites

1. Docker and Docker Compose installed
2. MySQL database already set up and running on localhost
3. Database schema imported
4. Ngrok account with authtoken (already configured in `ngrok/ngrok.yml`)

## Quick Start

1. **Update Database Configuration**
   Run the update script to set your MySQL password:
   ```bash
   update-docker-env.bat
   ```
   
   Or manually edit `backend/.env.docker`:
   ```env
   DB_PASSWORD=your_mysql_root_password
   ```

2. **Start Services**
   ```bash
   start-docker.bat
   ```
   
   Or manually:
   ```bash
   docker-compose up -d
   ```

3. **Access the Application**
   - **Local Access**: http://localhost
   - **Public Access**: Check http://localhost:4040 for the ngrok URL

4. **Get Public URL**
   ```bash
   check-ngrok-url.bat
   ```

## Directory Structure

```
├── backend/
│   ├── .env.docker          # Docker environment variables
│   └── ...                  # Backend files
├── frontend/
│   └── ...                  # Frontend files
├── ngrok/
│   └── ngrok.yml            # Ngrok configuration
├── docker-compose.yml       # Main Docker Compose file
├── nginx.conf               # Nginx reverse proxy configuration
└── Scripts/
    ├── start-docker.bat     # Start Docker services
    ├── stop-docker.bat      # Stop Docker services
    ├── check-ngrok-url.bat  # Display ngrok public URL
    └── update-docker-env.bat # Update Docker environment variables
```

## Services Overview

### Backend (Node.js + Express)
- Container: `lotto-backend`
- Port: 3001 (internal)
- Connects to MySQL on localhost via `host.docker.internal`
- Health check endpoint: http://localhost:3001/api/health

### Frontend (React + Vite)
- Container: `lotto-frontend`
- Served through Nginx
- Internal port: 80

### Nginx Reverse Proxy
- Container: `lotto-nginx`
- Public port: 80
- Routes:
  - `/` → Frontend
  - `/api/*` → Backend

### Ngrok Tunnel
- Container: `lotto-ngrok`
- Web interface: http://localhost:4040
- Public tunnel to Nginx

## Configuration Files

### docker-compose.yml
Main orchestration file with:
- Service definitions
- Network configuration
- Volume mounts
- Environment variables

### backend/.env.docker
Environment variables for the backend service:
```env
# Database Configuration
DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=lotto_vite_system
DB_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=*
```

### ngrok/ngrok.yml
Ngrok configuration:
```yaml
version: "2"
authtoken: 31oFpxg4CrclEGlCXFWTUm2dApc_29M6e2kSg7YMD6youhYER
tunnels:
  lotto-app:
    addr: nginx:80
    proto: http
```

### nginx.conf
Nginx reverse proxy configuration:
- Serves frontend static files
- Proxies API requests to backend
- Handles CORS
- Gzip compression

## Scripts

### start-docker.bat
Starts all Docker services in detached mode and displays status.

### stop-docker.bat
Stops all Docker services.

### check-ngrok-url.bat
Displays the public ngrok URL.

### update-docker-env.bat
Interactive script to update database password and JWT secret.

## Accessing the Application

### Local Development
- URL: http://localhost
- All services are accessible through the Nginx reverse proxy

### Public Access
- URL: Check http://localhost:4040
- Ngrok provides a public HTTPS URL for external access
- Useful for testing on mobile devices or sharing with others

## Troubleshooting

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
docker-compose logs ngrok
```

### Common Issues

1. **Database Connection Failed**
   - Check MySQL is running on localhost
   - Verify database credentials in `backend/.env.docker`
   - Ensure the database `lotto_vite_system` exists

2. **Ngrok Not Working**
   - Check http://localhost:4040 for errors
   - Verify ngrok authtoken in `ngrok/ngrok.yml`
   - Check your internet connection

3. **Frontend Not Loading**
   - Check Nginx configuration
   - Verify frontend container is running
   - Check browser console for errors

### Restart Services
```bash
# Stop services
docker-compose down

# Start services
docker-compose up -d

# Rebuild containers (if needed)
docker-compose up -d --build
```

## Security Considerations

1. **Change Default Secrets**
   - Update JWT secret in `backend/.env.docker`
   - Use a dedicated database user instead of root

2. **Production Deployment**
   - Don't expose database ports publicly
   - Use HTTPS in production
   - Implement proper authentication and authorization

3. **Ngrok Security**
   - Ngrok URLs are public - don't expose sensitive data
   - Use ngrok only for development/testing
   - Consider using reserved subdomains for consistent URLs

## Best Practices

1. **Environment Management**
   - Keep `.env.docker` secure and out of version control
   - Use different environment files for different environments

2. **Monitoring**
   - Regularly check service logs
   - Monitor resource usage with `docker stats`

3. **Updates**
   - Keep Docker images updated
   - Regularly update dependencies

4. **Backups**
   - Regular database backups
   - Backup important configuration files