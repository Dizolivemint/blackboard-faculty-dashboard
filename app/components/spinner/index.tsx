import styled, { keyframes } from 'styled-components';

// Keyframes for the spinner animation
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Spinner styled component
const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #007bff;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: ${spin} 1s linear infinite;
  margin: 0 auto;
`;

// Container for spinner and text
const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
`;

// Styled paragraph for loading text
const LoadingText = styled.p`
  margin-top: 10px;
  font-size: 16px;
  color: #007bff;
`;

export { Spinner, SpinnerContainer, LoadingText };