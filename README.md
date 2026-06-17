# Lottery Internal Terminal

Full-stack lottery management system with Admin and Agent panels.

## Tech Stack
- **Frontend**: React + Vite + TypeScript, Tailwind CSS v4, React Router v6, Zustand
- **Backend**: NestJS (REST API), JWT Auth
- **Database**: Supabase (PostgreSQL + Realtime)
- **Fonts**: Bebas Neue (titles), Rajdhani (body)

---

## Setup Instructions

### 1. Supabase Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text CHECK (role IN ('admin', 'agent')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Lotteries table
CREATE TABLE lotteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  draw_time timestamptz NOT NULL,
  stop_betting_minutes int DEFAULT 10,
  tab1_price numeric NOT NULL,
  tab2_price numeric NOT NULL,
  tab3_price numeric NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'done')),
  created_at timestamptz DEFAULT now()
);

-- Bets table
CREATE TABLE bets (
  id serial PRIMARY KEY,
  ticket_id text NOT NULL,
  agent_id uuid REFERENCES users(id),
  lottery_id uuid REFERENCES lotteries(id),
  type text CHECK (type IN ('A', 'B', 'C')),
  number int NOT NULL,
  count int NOT NULL,
  amount numeric NOT NULL,
  tab int CHECK (tab IN (1, 2, 3)),
  win_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Results table
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id uuid REFERENCES lotteries(id) UNIQUE,
  winning_number int NOT NULL,
  declared_at timestamptz DEFAULT now()
);

-- Agents table
CREATE TABLE agents (
  id uuid PRIMARY KEY REFERENCES users(id),
  username text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime on tables
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
ALTER PUBLICATION supabase_realtime ADD TABLE lotteries;
ALTER PUBLICATION supabase_realtime ADD TABLE results;

-- Seed admin user (password: admin123)
INSERT INTO users (username, password_hash, role, status)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'active'
);
```

> Note: The seed password hash above is for `admin123`. If it doesn't work, generate a fresh hash using the backend seed script or bcrypt online tool.

### 2. Backend Setup

```bash
cd lottery-app/backend
cp .env.example .env
# Fill in your .env values
npm run start:dev
```

**backend/.env**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-key
PORT=3000
```

### 3. Frontend Setup

```bash
cd lottery-app/frontend
cp .env.example .env
# Fill in your .env values
npm run dev
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## URLs

| Role  | Login URL                          | Dashboard               |
|-------|------------------------------------|-------------------------|
| Admin | http://localhost:5173/admin/login  | /admin/dashboard        |
| Agent | http://localhost:5173/agent/login  | /agent/home             |

**Default admin credentials:** `admin` / `admin123`

---

## Admin Panel Pages

| Page        | Route              | Description                       |
|-------------|--------------------|-----------------------------------|
| Dashboard   | /admin/dashboard   | Live stats, charts, recent bets   |
| Lotteries   | /admin/lotteries   | Create/manage lotteries           |
| Agents      | /admin/agents      | Create/manage agent accounts      |
| All Bets    | /admin/bets        | Live bet feed with filters        |
| Results     | /admin/results     | Declare winning numbers           |
| Risk View   | /admin/risk        | High-risk number exposure table   |
| Monitor     | /admin/monitor     | Real-time live bet monitor        |

## Agent Panel Pages

| Page           | Route              | Description                      |
|----------------|--------------------|----------------------------------|
| Home           | /agent/home        | Active lottery countdown + menu  |
| Data Entry     | /agent/data-entry  | Bet entry keypad                 |
| Sales Report   | /agent/sales       | Daily sales by date              |
| Account Summary| /agent/account     | Agent stats                      |
| Net Pay        | /agent/net-pay     | Per-lottery settlement           |
| My Profit      | /agent/profit      | Profit/loss breakdown            |
| Shop Result    | /agent/result      | Declared results + win amounts   |

---

## Key Features

- **JWT Auth**: Separate login flows for admin and agent
- **Role-based Guards**: NestJS global JwtAuthGuard + RolesGuard
- **Supabase Realtime**: Live updates on bets, lotteries, results
- **Data Entry Keypad**: Numeric keypad with A/B/C type selection and ALL shortcut
- **Win Calculation**: Auto-calculated on result declaration (count × tab1_price × 90)
- **Risk View**: Grouped exposure sorted by total amount at risk
