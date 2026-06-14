import { Avatar, Badge, Box, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { IconUserCircle } from '@tabler/icons-react'
import { useAuth } from '../../features/auth/use-auth'
import { SellerProductPreview } from '../../features/products/SellerProductPreview'

export function SellerProfilePage() {
  const { seller } = useAuth()

  return (
    <Stack gap="xl">
      <Paper
        p={{ base: 'lg', md: 'xl' }}
        radius="xl"
        shadow="md"
        style={{
          border: '1px solid rgba(154, 65, 254, 0.1)',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,239,252,0.96))',
        }}
      >
        <Group justify="space-between" align="start" gap="lg">
          <Group gap="md" align="center">
            <Avatar color="brand" radius="xl" size={58}>
              {seller?.display_name?.slice(0, 1).toUpperCase() ?? 'S'}
            </Avatar>

            <Box maw={760}>
              <Text c="brand.7" fw={700} tt="uppercase" size="sm" mb="xs">
                Личный кабинет
              </Text>
              <Title order={2} c="dark.8">
                {seller?.display_name ?? 'Продавец'}
              </Title>
              <Text c="dimmed" mt="sm" size="lg">
                Личный кабинет продавца с базовой информацией об аккаунте и обзором
                ассортимента.
              </Text>
            </Box>
          </Group>

          <IconUserCircle size={34} color="#9A41FE" />
        </Group>
      </Paper>

      <Paper
        p={{ base: 'lg', md: 'xl' }}
        radius="xl"
        shadow="sm"
        style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="start" gap="md">
            <div>
              <Title order={4}>Профиль продавца</Title>
              <Text c="dimmed" mt="sm">
                Базовые данные текущего seller-аккаунта.
              </Text>
            </div>

            <Badge color={seller?.is_active ? 'green' : 'gray'} variant="light">
              {seller?.is_active ? 'Аккаунт активен' : 'Аккаунт неактивен'}
            </Badge>
          </Group>

          <Group gap="md" wrap="wrap" align="stretch">
            <Paper radius="lg" p="md" bg="gray.0" style={{ minWidth: 220 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Имя
              </Text>
              <Text fw={700} mt={6}>
                {seller?.display_name ?? '—'}
              </Text>
            </Paper>

            <Paper radius="lg" p="md" bg="gray.0" style={{ minWidth: 220 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Логин
              </Text>
              <Text fw={700} mt={6}>
                {seller?.username ?? '—'}
              </Text>
            </Paper>

            <Paper radius="lg" p="md" bg="gray.0" style={{ minWidth: 220 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Email
              </Text>
              <Text fw={700} mt={6}>
                {seller?.email ?? 'Не указан'}
              </Text>
            </Paper>
          </Group>
        </Stack>
      </Paper>

      <SellerProductPreview sellerId={seller?.id ?? null} />
    </Stack>
  )
}
