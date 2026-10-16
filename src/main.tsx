import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { sanitizeWebAnalyticsEvent } from './web-analytics';
import './style.css';
const hostedProduction = import.meta.env.PROD && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
ReactDOM.createRoot(document.getElementById('root')!).render(<><App/>{hostedProduction&&<Analytics mode="production" debug={false} beforeSend={sanitizeWebAnalyticsEvent}/>}</>);
