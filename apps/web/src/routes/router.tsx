import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import NotFound from '../components/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dataset/mastr-clean" replace /> },
      {
        path: 'dataset/:slug',
        lazy: async () => {
          const mod = await import('../datasets/DatasetView');
          return { Component: mod.default };
        },
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
