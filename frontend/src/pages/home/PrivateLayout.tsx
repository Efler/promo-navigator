import {
  ActionIcon,
  Avatar,
  Box,
  Container,
  Group,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconBell,
  IconChevronDown,
  IconHelpCircle,
  IconLogout2,
  IconMessageCircle,
  IconSearch,
  IconUserCircle,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/use-auth'
import { TopAccent } from '../../shared/ui/TopAccent'
import { mechanics } from './mechanics'

const marketplaceSections = [
  'Рост продаж',
  'Товары и цены',
  'Поставки и заказы',
  'Аналитика',
  'Продвижение',
  'Финансы',
]

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

        <Box className="marketplace-header">
          <Container size="xl" h="100%">
            <Group h="100%" gap="lg" wrap="nowrap">
              <UnstyledButton
                className="marketplace-logo"
                type="button"
                aria-label="WB Partners"
              >
                <Text span className="marketplace-logo__wb">
                  wb
                </Text>{' '}
                partners
              </UnstyledButton>

              <Group className="marketplace-nav" gap={4} wrap="nowrap">
                {marketplaceSections.map((section) => (
                  <UnstyledButton
                    key={section}
                    type="button"
                    className="marketplace-nav__item"
                  >
                    {section}
                  </UnstyledButton>
                ))}
              </Group>

              <Group className="marketplace-actions" gap={6} wrap="nowrap">
                <Tooltip label="Поиск">
                  <ActionIcon
                    type="button"
                    size={34}
                    radius="md"
                    variant="filled"
                    color="dark"
                    aria-label="Поиск"
                  >
                    <IconSearch size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Сообщения">
                  <ActionIcon
                    type="button"
                    size={34}
                    radius="md"
                    variant="subtle"
                    color="dark"
                    aria-label="Сообщения"
                  >
                    <IconMessageCircle size={17} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Уведомления">
                  <ActionIcon
                    type="button"
                    size={34}
                    radius="md"
                    variant="subtle"
                    color="dark"
                    aria-label="Уведомления"
                  >
                    <IconBell size={17} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Помощь">
                  <ActionIcon
                    type="button"
                    size={34}
                    radius="md"
                    variant="subtle"
                    color="dark"
                    aria-label="Помощь"
                  >
                    <IconHelpCircle size={17} />
                  </ActionIcon>
                </Tooltip>

                <Menu position="bottom-end" shadow="md" width={210}>
                  <Menu.Target>
                    <UnstyledButton type="button" className="marketplace-profile">
                      <Avatar color="brand" radius="xl" size={26}>
                        {seller?.display_name?.slice(0, 1).toUpperCase() ?? 'S'}
                      </Avatar>
                      <Text fw={650} size="sm" className="marketplace-profile__name">
                        {seller?.display_name}
                      </Text>
                      <IconChevronDown size={15} />
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Аккаунт продавца</Menu.Label>
                    <Menu.Item
                      leftSection={<IconUserCircle size={16} />}
                      onClick={() => navigate('/app/profile')}
                    >
                      Личный кабинет
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout2 size={16} />}
                      onClick={handleLogout}
                    >
                      Выйти
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Container>
        </Box>

        <Container size="xl" py="lg">
          <Stack gap="md">
            <div>
              <Title order={2}>Промо-навигатор</Title>
              <Text c="dimmed" mt={6}>
                Управление механиками продвижения для продавцов
              </Text>
            </div>

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
