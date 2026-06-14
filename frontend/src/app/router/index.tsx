import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { GuestOnlyRoute } from '../../features/auth/GuestOnlyRoute'
import { RequireAuth } from '../../features/auth/RequireAuth'
import { BundleConstructorPage } from '../../pages/bundles/BundleConstructorPage'
import { BundleListPage } from '../../pages/bundles/BundleListPage'
import { MechanicsOverviewPage } from '../../pages/home/MechanicsOverviewPage'
import { MechanicWorkspacePage } from '../../pages/home/MechanicWorkspacePage'
import { PrivateLayout } from '../../pages/home/PrivateLayout'
import { LoginPage } from '../../pages/login/LoginPage'
import { PromocodeConstructorPage } from '../../pages/promocodes/PromocodeConstructorPage'
import { PromocodeListPage } from '../../pages/promocodes/PromocodeListPage'
import { SellerProfilePage } from '../../pages/profile/SellerProfilePage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/login',
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <PrivateLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <MechanicsOverviewPage />,
      },
      {
        path: 'profile',
        element: <SellerProfilePage />,
      },
      {
        path: 'promotions',
        element: (
          <MechanicWorkspacePage
            title="Акции"
            description="Создавайте акции для отдельных товаров и подбирайте условия, которые помогают повысить продажи."
          />
        ),
      },
      {
        path: 'promocodes',
        element: <PromocodeListPage />,
      },
      {
        path: 'promocodes/new',
        element: <PromocodeConstructorPage />,
      },
      {
        path: 'bundles',
        element: <BundleListPage />,
      },
      {
        path: 'bundles/new',
        element: <BundleConstructorPage />,
      },
      {
        path: '*',
        element: <Navigate to="/app" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
