// __mocks__/react-router-dom.js
const React = require('react');

// Mock all the exports from react-router-dom
const reactRouterDom = jest.createMockFromModule('react-router-dom');

// Add custom implementations
reactRouterDom.BrowserRouter = ({ children }) => React.createElement('div', { 'data-testid': 'mock-browser-router' }, children);
reactRouterDom.Routes = ({ children }) => React.createElement('div', { 'data-testid': 'mock-routes' }, children);
reactRouterDom.Route = ({ path, element }) => React.createElement('div', { 'data-testid': `mock-route-${path}` }, element);
reactRouterDom.Link = ({ to, children }) => React.createElement('a', { href: to, 'data-testid': `mock-link-${to}` }, children);
reactRouterDom.useNavigate = () => jest.fn();
reactRouterDom.useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
reactRouterDom.useParams = () => ({});
reactRouterDom.Outlet = () => React.createElement('div', { 'data-testid': 'mock-outlet' });

module.exports = reactRouterDom;