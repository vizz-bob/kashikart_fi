# Contributing to KashiKart

Thank you for your interest in contributing to KashiKart Tender Intelligence System! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Backend**: Python 3.11+, PostgreSQL/MySQL
- **Frontend**: Node.js 18+, React, Vite
- **Tools**: Git, Docker (optional), AWS CLI (for deployment)

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/KashiKart-Fi.git
   cd KashiKart-Fi
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Copy environment template
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Copy environment template
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

## 📁 Project Structure

```
KashiKart-Fi/
├── backend/                    # FastAPI Python backend
│   ├── app/                   # Application source code
│   │   ├── core/             # Core configuration
│   │   ├── models/           # Database models
│   │   ├── routers/          # API endpoints
│   │   ├── schemas/          # Pydantic schemas
│   │   └── utils/            # Utility functions
│   ├── tests/                # Backend tests
│   ├── alembic/              # Database migrations
│   └── requirements.txt      # Python dependencies
├── frontend/                  # React frontend
│   ├── src/                  # React components
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API services
│   │   └── utils/            # Utility functions
│   ├── public/               # Static assets
│   ├── tests/                # Frontend tests
│   └── package.json          # Node.js dependencies
├── scripts/                   # Deployment and utility scripts
├── config/                    # Configuration files
├── .github/                   # GitHub workflows and templates
└── docs/                      # Documentation
```

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/your-bug-fix
```

### 2. Make Your Changes

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
python -m pytest tests/ -v

# Frontend tests
cd frontend
npm test

# Type checking
npm run type-check
```

### 4. Submit a Pull Request

1. Push your branch to your fork
2. Create a pull request against the `main` branch
3. Fill out the pull request template completely
4. Wait for code review

## 📋 Coding Standards

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints for function signatures
- Write docstrings for all functions and classes
- Use meaningful variable and function names
- Keep functions small and focused

```python
# Good example
async def get_tenders_by_status(
    status: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
) -> List[TenderResponse]:
    """
    Retrieve tenders by their status.
    
    Args:
        status: The status to filter by
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List of tenders with the specified status
    """
    query = select(Tender).where(Tender.status == status)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()
```

### Frontend (TypeScript/React)

- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling
- Use Tailwind CSS for styling

```typescript
// Good example
interface TenderCardProps {
  tender: Tender;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
}

const TenderCard: React.FC<TenderCardProps> = ({ 
  tender, 
  onUpdate, 
  onDelete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUpdate = useCallback(() => {
    setIsLoading(true);
    onUpdate(tender.id);
  }, [tender.id, onUpdate]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Component content */}
    </div>
  );
};

export default TenderCard;
```

## 🧪 Testing Guidelines

### Backend Testing

- Use pytest for unit and integration tests
- Mock external dependencies
- Test both success and error scenarios
- Aim for high code coverage

```python
# Example test
@pytest.mark.asyncio
async def test_create_tender_success():
    """Test successful tender creation."""
    tender_data = {
        "title": "Test Tender",
        "description": "Test Description",
        "status": "active"
    }
    
    response = client.post("/api/tenders/", json=tender_data)
    assert response.status_code == 201
    
    created_tender = response.json()
    assert created_tender["title"] == tender_data["title"]
```

### Frontend Testing

- Use React Testing Library for component tests
- Test user interactions and behavior
- Mock API calls in tests
- Test accessibility

```typescript
// Example test
import { render, screen, fireEvent } from '@testing-library/react';
import TenderCard from './TenderCard';

describe('TenderCard', () => {
  const mockTender = {
    id: '1',
    title: 'Test Tender',
    status: 'active'
  };
  
  it('renders tender information correctly', () => {
    render(<TenderCard tender={mockTender} onUpdate={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByText('Test Tender')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
```

## 📝 Documentation

- Update README.md when adding new features
- Document API endpoints using FastAPI's automatic docs
- Add inline comments for complex logic
- Update the deployment guide when changing deployment processes

## 🚀 Deployment

### Automated Deployment

- Pushing to `main` branch triggers automatic deployment to production
- Pull requests trigger deployment to staging
- Windows .exe is built on tag creation

### Manual Deployment

```bash
# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Create backup
./scripts/backup.sh s3
```

## 🔍 Code Review Process

### Reviewer Guidelines

1. **Functionality**: Does the code work as intended?
2. **Code Quality**: Is the code clean and maintainable?
3. **Testing**: Are there adequate tests?
4. **Documentation**: Is the documentation updated?
5. **Performance**: Are there any performance implications?
6. **Security**: Are there any security concerns?

### Author Guidelines

1. Address all review comments
2. Update tests and documentation
3. Keep the discussion focused and constructive
4. Mark conversations as resolved when addressed

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed reproduction steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, version information
6. **Logs**: Relevant error logs or screenshots

## ✨ Feature Requests

When requesting features, please include:

1. **Description**: Clear description of the feature
2. **Motivation**: Why this feature is needed
3. **Proposed Solution**: How you envision it working
4. **Alternatives**: Other approaches considered
5. **Mockups**: Any UI designs or mockups

## 🏷️ Labels and Milestones

### Common Labels

- `bug`: Bug fixes
- `enhancement`: New features
- `documentation`: Documentation updates
- `good first issue`: Good for newcomers
- `help wanted`: Community help needed
- `priority/high`: High priority issues
- `priority/medium`: Medium priority issues
- `priority/low`: Low priority issues

### Milestones

- `v1.0.0`: Initial release
- `v1.1.0`: Feature enhancements
- `v1.2.0`: Performance improvements

## 🤝 Community Guidelines

### Code of Conduct

1. **Be Respectful**: Treat everyone with respect and professionalism
2. **Be Inclusive**: Welcome contributions from everyone
3. **Be Constructive**: Provide helpful and constructive feedback
4. **Be Patient**: Remember that everyone has different experience levels
5. **Be Collaborative**: Work together to achieve the best outcome

### Communication

- Use GitHub issues for bug reports and feature requests
- Use discussions for general questions and ideas
- Be responsive to comments and feedback
- Ask for help when needed

## 🎯 Getting Help

If you need help:

1. Check the [documentation](docs/)
2. Search existing [issues](../../issues)
3. Create a new [discussion](../../discussions)
4. Ask in the [issues](../../issues) with the `question` label

## 📞 Contact

- **Maintainers**: @maintainer1, @maintainer2
- **Email**: dev@kashikart.com
- **Discord**: [Join our Discord](https://discord.gg/kashikart)

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Annual contributor highlights
- Special contributor badges

---

Thank you for contributing to KashiKart! Your contributions help make this project better for everyone. 🚀
