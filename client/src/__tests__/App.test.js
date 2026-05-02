import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders login form when not authenticated', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /로그인/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
});
<parameter name="filePath">c:\Users\82105\SWD\SWD_Project\client\src\__tests__\App.test.js </parameter>