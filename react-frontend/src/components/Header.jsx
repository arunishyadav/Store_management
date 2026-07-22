import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button, IconButton } from '@mui/material';
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

const Header = ({ onDrawerToggle }) => {
  const { user, logout, updateLocation, selectedLocation } = useAuthStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get('/api/v1/locations')
        .then(res => {
          setLocations(res.data);
          // Auto-select first location if none selected
          if (!selectedLocation && res.data.length > 0) {
            updateLocation(res.data[0]);
          }
        })
        .catch(err => console.error("Error fetching locations", err));
    }
  }, [user, selectedLocation, updateLocation]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLocationChange = (loc) => {
    updateLocation(loc);
    handleClose();
  };

  return (
    <AppBar position="fixed" sx={{ 
      zIndex: (theme) => theme.zIndex.drawer + 1, 
      backgroundColor: 'white', 
      color: 'text.primary', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
    }}>
      <Toolbar>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Inventory Management</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Finsen</Box>
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
              Location: <strong>{selectedLocation?.name || user.location || 'Not Set'}</strong>
            </Typography>
            
            <Box>
              <Button onClick={handleMenu} color="inherit" sx={{ minWidth: 'auto', p: { xs: 1, sm: 1 } }}>
                <AccountCircle sx={{ mr: { sm: 1 } }} />
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, textTransform: 'none' }}>
                  {user.name || user.user_id || 'User'}
                </Typography>
              </Button>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                {user.role === 'SUPER_ADMIN' && (
                  <>
                    <MenuItem disabled sx={{ opacity: '1 !important', fontWeight: 'bold', color: 'primary.main' }}>
                      Change Location
                    </MenuItem>
                    {locations.map((loc) => (
                      <MenuItem key={loc.id} onClick={() => handleLocationChange(loc)} selected={selectedLocation?.id === loc.id}>
                        {loc.name}
                      </MenuItem>
                    ))}
                  </>
                )}
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main', mt: 1, borderTop: '1px solid #eee' }}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;

