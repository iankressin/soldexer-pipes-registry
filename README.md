# SPM (Squid Pipe Manager)

A Node.js API for managing pipes and versions built with Fastify, TypeScript, and Drizzle ORM.

## Features

- **Pipe Management**: Create, read, update, and delete pipes
- **Version Control**: Track multiple versions for each pipe
- **RESTful API**: Clean REST endpoints with proper HTTP status codes
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Type Safety**: Full TypeScript support
- **Testing**: Comprehensive integration tests with Vitest

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd spm
```

2. Install dependencies:
```bash
yarn install
```

3. Set up your database:
```bash
# Create databases
createdb spm_db
createdb spm_test_db

# Run migrations
yarn db:migrate
```

4. Start the development server:
```bash
yarn dev
```

The server will be available at `http://localhost:3000`.

## API Endpoints

### Pipes

- `POST /pipes` - Create a new pipe with initial version
- `GET /pipes` - Get all pipes with pagination
- `GET /pipes/:id` - Get pipe by ID
- `PUT /pipes/:id` - Update pipe
- `DELETE /pipes/:id` - Delete pipe

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run integration tests only
yarn test:integration

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

## Development

### Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run linter
- `yarn format` - Format code
- `yarn db:generate` - Generate new migration
- `yarn db:migrate` - Apply migrations
- `yarn db:push` - Push schema changes
- `yarn db:studio` - Open Drizzle Studio

### Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # Database schemas
├── routes/          # Route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── db/              # Database configuration

test/
├── setup.ts         # Test environment setup
└── *.test.ts        # Test files
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@localhost:5432/spm_db` |
| `TEST_DATABASE_URL` | Test database connection string | `postgresql://username:password@localhost:5432/spm_test_db` |
| `NODE_ENV` | Environment mode | `development` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `yarn test`
6. Submit a pull request

## License

[Add your license information here]
