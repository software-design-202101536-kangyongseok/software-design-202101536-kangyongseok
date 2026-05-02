import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders the app component', () => {
  render(<App />);
  const linkElement = screen.getByText(/Welcome/i);
  expect(linkElement).toBeInTheDocument();
});
<parameter name="filePath">c:\Users\82105\SWD\SWD_Project\client\src\__tests__\App.test.js </parameter>