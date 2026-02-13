# Contributing to GeoTools Suite

Thank you for your interest in contributing to GeoTools Suite! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Browser and OS** information
- **Console errors** from DevTools

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why this would be useful
- **Proposed solution** or implementation ideas
- **Alternative solutions** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test thoroughly** - ensure nothing breaks
4. **Update documentation** if needed
5. **Write meaningful commit messages**
6. **Submit your pull request**

#### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update the README.md if needed
- Add tests for new features
- Ensure all tests pass
- Follow the existing code style
- Include screenshots for UI changes

## Development Setup

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.6+ or Node.js 14+
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/geotools-suite.git
cd geotools-suite

# Install dependencies (if using Node.js tools)
npm install

# Start local server
npm start
# or
python3 -m http.server 8000 --directory docs

# Open browser
open http://localhost:8000
```

### Running Tests

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check accessibility
npm run test:accessibility

# Check security
npm run test:security

# Run Lighthouse
npm run lighthouse
```

## Coding Standards

### JavaScript

- Use **ES6+** features
- Use `const` and `let` instead of `var`
- Use arrow functions where appropriate
- Add JSDoc comments for functions
- Follow the ESLint configuration
- No `console.log` in production code

### HTML

- Use semantic HTML5 elements
- Include ARIA attributes for accessibility
- Maintain proper heading hierarchy (h1 → h2 → h3)
- Add `alt` text for all images
- Use proper form labels

### CSS

- Use CSS custom properties (variables)
- Follow BEM naming convention for classes
- Mobile-first responsive design
- Support both light and dark themes
- Ensure 4.5:1 contrast ratio (WCAG AA)

### Accessibility

All contributions must meet WCAG 2.1 AA standards:

- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Proper color contrast
- ✅ Focus indicators
- ✅ ARIA labels and roles
- ✅ Alt text for images
- ✅ Skip navigation links

## Project Structure

```
geotools-suite/
├── docs/                      # Source files
│   ├── index.html            # Main dashboard
│   ├── pages/                # Tool pages
│   │   ├── file-converter.html
│   │   ├── dltm-converter.html
│   │   ├── coordinate-transform.html
│   │   └── area-calculator.html
│   ├── shared/               # Shared components
│   │   ├── css/             # Global styles
│   │   └── js/              # Global scripts
│   ├── styles.css           # Main stylesheet
│   └── vendor/              # Third-party libraries
├── scripts/                  # Build and test scripts
├── .github/                  # GitHub Actions workflows
├── package.json             # Node.js configuration
├── README.md                # Project documentation
└── LICENSE                  # License file
```

## Commit Message Guidelines

Use clear and meaningful commit messages:

```
<type>: <subject>

[optional body]
[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or tools

**Examples:**
```
feat: add Arabic language support to dashboard
fix: resolve map rendering issue in Safari
docs: update installation instructions
style: format code with Prettier
```

## Internationalization (i18n)

When adding new text content:

1. Add the English text first
2. Provide Arabic translation if possible
3. Use proper RTL directives for Arabic
4. Test with both LTR and RTL layouts

## Testing Checklist

Before submitting your PR, ensure:

- [ ] Code follows style guidelines
- [ ] All existing tests pass
- [ ] New features have tests
- [ ] Accessibility tests pass
- [ ] Works on Chrome, Firefox, Safari, and Edge
- [ ] Works on mobile devices
- [ ] Dark mode works correctly
- [ ] No console errors
- [ ] Documentation updated

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to GeoTools Suite! 🎉
