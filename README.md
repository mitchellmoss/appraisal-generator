# Appraisal Generator

A web application for creating, printing, and saving jewelry or valuable item appraisals. This application allows users to enter client details, add multiple article descriptions, print appraisals, and download them as HTML files with proper formatting. All appraisals are now saved on the server as well.

## Features

- Client information form
- Dynamic addition and removal of article descriptions
- Local storage to save form data between sessions
- Print functionality with proper styling
- Download appraisals as HTML files
- Server-side storage of all appraisals

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
   
For development with auto-restart:
```
npm run dev
```

## Usage

1. Open the application in your browser at http://localhost:3000
2. Fill out the client and appraiser information
3. Add article descriptions as needed
4. Click "Print" to print the appraisal or "Download" to save it as an HTML file
   - When clicking "Download", the appraisal will be saved to the server and downloaded locally

## API Endpoints

The server provides the following API endpoints:

- `POST /api/appraisals` - Save a new appraisal
- `GET /api/appraisals/:id` - Retrieve a specific appraisal
- `GET /api/appraisals` - List all saved appraisals

## File Storage

All appraisals are saved as JSON files in the `appraisals` directory with unique UUIDs as filenames.

## Project Structure

- `index.html` - Main application HTML
- `style.css` - Styling for the application
- `script.js` - Client-side JavaScript for form handling and API integration
- `server.js` - Express server with API endpoints
- `appraisals/` - Directory where appraisal data is stored

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- UUID for unique identifiers
Excellent! Now that PM2 is installed, you can use it to manage your application in a production environment.

Here's how you can use PM2 with your [`server.js`](server.js:0) application:

2.  **Starting your application with PM2:**
    Open your terminal and run:
    ```bash
    pm2 start server.js --name appraisal-generator -i max
    ```
    *   `pm2 start server.js`: This tells PM2 to start your `server.js` file.
    *   `--name appraisal-generator`: This gives your application a name within PM2, making it easier to manage.
    *   `-i max`: This starts your application in cluster mode, utilizing all available CPU cores. This is great for performance. If you prefer to run a single instance, you can omit `-i max` or use `-i 1`.

3.  **Common PM2 Commands:**
    Once your application is running, you can manage it with these commands:
    *   `pm2 list` or `pm2 ls`: Lists all applications managed by PM2 and their status.
    *   `pm2 logs appraisal-generator`: Shows the logs for your application. You can also use `pm2 logs` to see logs for all apps.
    *   `pm2 stop appraisal-generator`: Stops your application.
    *   `pm2 restart appraisal-generator`: Restarts your application.
    *   `pm2 delete appraisal-generator`: Stops your application and removes it from PM2's list.
    *   `pm2 monit`: Opens a live dashboard to monitor CPU and memory usage of your apps.

4.  **Saving your PM2 process list and creating a startup script:**
    To ensure your application restarts automatically after a server reboot, you can do the following:
    *   `pm2 save`: Saves the current list of processes managed by PM2.
    *   `pm2 startup`: This command will detect your server's init system (like systemd, upstart, launchd) and provide you with a command to run. This command (usually run with `sudo`) will configure PM2 to start automatically on boot, along with your saved processes.

5.  **Ecosystem File (Optional but Recommended for Production):**
    For more complex configurations, you can create an `ecosystem.config.js` file in your project root. This file allows you to define all PM2 options for your app(s) in one place, including environment variables, log file paths, deployment options, and more.

    Example `ecosystem.config.js`:
    ```javascript
    module.exports = {
      apps : [{
        name   : "appraisal-generator",
        script : "./server.js",
        instances: "max", // Or a specific number of instances
        exec_mode : "cluster", // Enables clustering
        watch  : false, // Set to true to restart on file changes (usually for dev)
        env    : {
          "NODE_ENV": "development"
        },
        env_production: { // Environment variables for production
          "NODE_ENV": "production",
          "PORT": 3000, // Or your desired production port
          // Add other production-specific env vars here
          // "API_SECRET_KEY": "your_production_secret_key",
          // "ABUSEIPDB_API_KEY": "your_production_abuseipdb_key"
        }
      }]
    }
    ```
    You would then start your application using `pm2 start ecosystem.config.js --env production`.
    **Important:** Remember to set your actual secret keys and other sensitive information directly in your production environment's variables or a secure vault, not in the `ecosystem.config.js` if it's committed to version control. The `env_production` block in the ecosystem file is more for non-sensitive configurations or for PM2 to pass through system environment variables.

By using Helmet.js and PM2, you've taken significant steps towards a more secure and robust production deployment for your appraisal generator application.