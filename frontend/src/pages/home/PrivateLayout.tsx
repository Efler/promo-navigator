import {
  Avatar,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { IconLogout2 } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/use-auth'
import { TopAccent } from '../../shared/ui/TopAccent'
import { mechanics } from './mechanics'

export function PrivateLayout() {
  const { seller, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      notifications.show({
        color: 'brand',
        title: 'Сессия завершена',
        message: 'Ты вышел из seller workspace.',
      })
      navigate('/login')
    } catch {
      notifications.show({
        color: 'red',
        title: 'Не удалось выйти',
        message: 'Backend недоступен или сессия уже истекла.',
      })
    }
  }

  return (
    <Box>
      <Box
        component="header"
        bg="rgba(255, 255, 255, 0.98)"
        style={{
          borderBottom: '1px solid rgba(154, 65, 254, 0.1)',
          boxShadow: '0 10px 28px rgba(154, 65, 254, 0.08)',
        }}
      >
        <TopAccent />
        <Container size="xl" py="lg">
          <Stack gap="md">
            <Group justify="space-between" align="start" gap="lg">
              <div>
                <Title order={2}>Промо конструктор</Title>
                <Text c="dimmed" mt={6}>
                  Конструктор механик продвижения для продавцов
                </Text>
              </div>

              <Paper
                radius="xl"
                p="xs"
                shadow="sm"
                style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
              >
                <Group gap="sm" wrap="nowrap">
                  <UnstyledButton
                    onClick={() => navigate('/app/profile')}
                    style={{ borderRadius: '999px', padding: '2px 6px' }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color="brand" radius="xl">
                        {seller?.display_name?.slice(0, 1).toUpperCase() ?? 'S'}
                      </Avatar>
                      <div>
                        <Text fw={700} size="sm">
                          {seller?.display_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Личный кабинет
                        </Text>
                      </div>
                    </Group>
                  </UnstyledButton>
                  <Button
                    variant="subtle"
                    color="brand"
                    size="compact-sm"
                    onClick={handleLogout}
                    leftSection={<IconLogout2 size={16} />}
                  >
                    Выйти
                  </Button>
                </Group>
              </Paper>
            </Group>

            <Group gap="xs" wrap="wrap">
              {mechanics.map((mechanic) => (
                <NavLink
                  key={mechanic.key}
                  to={mechanic.to}
                  className={({ isActive }) =>
                    isActive ? 'mechanic-link mechanic-link--active' : 'mechanic-link'
                  }
                  end={mechanic.to === '/app'}
                >
                  {mechanic.label}
                  {mechanic.isBeta ? (
                    <Text span size="xs" c="beta.4">
                      Beta
                    </Text>
                  ) : null}
                </NavLink>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      <Box component="main">
        <Container size="xl" py="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}
