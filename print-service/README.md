# Print Service

Express server for handling Brother label printer requests.

## Installation

Note: @thiagoelg/node-printer requires native compilation with Python 3.x and Visual Studio build tools.

### Windows Setup

1. Install Python 3.x from https://www.python.org/
2. Install Visual Studio Build Tools (C++ workloads)
3. Run: npm install

If installation fails, the server will run in stub mode (without actual printing capability).

## Running

node server.js

The service will start on port 3001.
