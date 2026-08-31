import React from 'react';
import { LoginPage } from '../components/LoginPage';

interface LoginProps {
  onLoginSuccess?: (token: string, user: any) => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess = () => {},
  darkMode = false,
  setDarkMode = () => {}
}) => {
  return (
    <LoginPage
      onLoginSuccess={onLoginSuccess}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    />
  );
};
