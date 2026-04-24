## 📝 Pull Request Description

Please provide a clear and concise description of what this PR changes and why it's needed.

## 🔄 Changes Made

### 🐛 Bug Fixes
- [ ] Fixed bug description
- [ ] Add more bullet points for each fix

### ✨ New Features
- [ ] Added feature description
- [ ] Add more bullet points for each feature

### 🔧 Improvements
- [ ] Performance improvements
- [ ] Code refactoring
- [ ] Documentation updates
- [ ] Add more bullet points for each improvement

## 🧪 Testing

### Manual Testing
- [ ] Tested on local development environment
- [ ] Tested on staging environment
- [ ] Tested Windows .exe functionality
- [ ] Tested API endpoints
- [ ] Tested UI components

### Automated Testing
- [ ] All existing tests pass
- [ ] Added new test cases for new functionality
- [ ] Code coverage maintained/improved

## 📋 Deployment Checklist

### Backend Changes
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented
- [ ] API documentation updated
- [ ] Backend tests passing

### Frontend Changes
- [ ] Components tested in different browsers
- [ ] Responsive design verified
- [ ] Accessibility considerations addressed
- [ ] Frontend tests passing

### Deployment
- [ ] Docker containers build successfully
- [ ] Environment-specific configurations updated
- [ ] SSL certificates considered (if needed)
- [ ] Rollback plan documented

## 🔍 Review Focus Areas

Please pay special attention to:

1. **Security**: Are there any security implications?
2. **Performance**: Does this affect application performance?
3. **Compatibility**: Will this work across different environments?
4. **User Experience**: How does this impact the end user?

## 📸 Screenshots/Videos

If this PR includes UI changes, please include screenshots or a short video:

<!-- Add screenshots or screen recordings here -->

## 🔗 Related Issues

Closes: #(issue number)
Related to: #(issue number)

## ✅ Checklist

### Code Quality
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings

### Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested my changes in multiple environments

### Documentation
- [ ] I have updated the README.md (if applicable)
- [ ] I have updated the API documentation (if applicable)
- [ ] I have documented any new environment variables
- [ ] I have documented any new configuration options

### Deployment
- [ ] I have checked that my changes work in Docker
- [ ] I have verified that the Windows .exe still works (if applicable)
- [ ] I have considered backward compatibility
- [ ] I have tested the deployment process

## 📝 Additional Notes

Add any additional context or notes about this PR here.

---

## 🚀 Merge Instructions

Once this PR is approved and ready to merge:

1. **Automated Deployment**: Merge to `main` branch will trigger automatic deployment to production
2. **Manual Deployment**: If manual deployment is needed, run: `./scripts/deploy.sh production`
3. **Rollback**: If issues arise, use: `./scripts/rollback.sh <previous-commit-hash>`

## 📊 Post-Merge Verification

After merging, please verify:

- [ ] Application is accessible at https://your-domain.com
- [ ] API documentation is available at https://your-domain.com/docs
- [ ] All critical functionality is working
- [ ] No new errors in application logs
- [ ] Performance metrics are within acceptable ranges
