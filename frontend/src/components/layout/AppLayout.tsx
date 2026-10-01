import { ReactNode } from 'react';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box minHeight="100vh" bgcolor="grey.50">
      <AppBar position="static" className="no-print">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/invoices')}
          >
            SimpleInvoice
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {user && (
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.fullname}
              </Typography>
            )}
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      {children}
    </Box>
  );
}
