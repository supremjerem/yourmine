#!/bin/bash
# Start backend and frontend for development

echo "🚀 Starting Yourmine Web Interface..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt

# Start backend in background
echo "🔧 Starting FastAPI backend on http://localhost:8000..."
cd backend
python api.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start frontend
echo "⚛️  Starting React frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Yourmine is running!"
echo "   - Backend API: http://localhost:8000"
echo "   - Frontend UI: http://localhost:3000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
