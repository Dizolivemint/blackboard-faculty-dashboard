import './global.css';
import { StyledComponentsRegistry } from './registry';

export const metadata = {
  title: 'Blackboard Faculty Dashboard',
  description: 'A dashboard for faculty to submit grades. Also, for adding missing Blackboard features.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
