import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCopy, IconPlus, IconTag } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { usePromocodesQuery } from '../../features/promocodes/use-promocodes'

function formatPeriod(startsOn: string, endsOn: string) {
  return `${dayjs(startsOn).format('DD.MM.YYYY')} - ${dayjs(endsOn).format('DD.MM.YYYY')}`
}

function formatDiscount(discountMode: 'percent' | 'amount', discountValue: number) {
  return discountMode === 'percent'
    ? `${discountValue}%`
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }).format(discountValue)
}

export function PromocodeListPage() {
  const navigate = useNavigate()
  const promocodesQuery = usePromocodesQuery()

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      notifications.show({
        color: 'brand',
        title: 'Промокод скопирован',
        message: `${code} скопирован в буфер обмена.`,
      })
    } catch {
      notifications.show({
        color: 'red',
        title: 'Не удалось скопировать',
        message: 'Попробуйте скопировать промокод вручную.',
      })
    }
  }

  return (
    <Stack gap="xl">
      <Paper
        radius="xl"
        p={{ base: 'lg', md: 'xl' }}
        shadow="md"
        style={{
          border: '1px solid rgba(154, 65, 254, 0.1)',
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(244,239,252,0.96))',
        }}
      >
        <Group justify="space-between" align="start" gap="lg">
          <div>
            <Badge variant="light" color="brand" mb="md">
              Промокоды
            </Badge>
            <Title order={1}>Промокоды продавца</Title>
            <Text c="dimmed" mt="sm" maw={760}>
              Создавайте новые промокоды и следите за уже подготовленными настройками в
              одном месте.
            </Text>
          </div>

          <Button
            size="md"
            radius="xl"
            leftSection={<IconPlus size={18} />}
            onClick={() => navigate('/app/promocodes/new')}
          >
            Создать новый промокод
          </Button>
        </Group>
      </Paper>

      <Paper
        radius="xl"
        p={{ base: 'lg', md: 'xl' }}
        shadow="sm"
        style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Существующие промокоды</Title>
              <Text c="dimmed" mt="sm">
                Здесь отображаются все промокоды, созданные в кабинете продавца.
              </Text>
            </div>
            {promocodesQuery.isFetching && !promocodesQuery.isLoading ? (
              <Text size="sm" c="dimmed">
                Обновляем список...
              </Text>
            ) : null}
          </Group>

          {promocodesQuery.isLoading ? (
            <Group justify="center" py="xl">
              <Loader color="brand" />
            </Group>
          ) : null}

          {!promocodesQuery.isLoading && promocodesQuery.isError ? (
            <Paper radius="xl" p="xl" bg="red.0">
              <Stack align="center" gap="sm">
                <ThemeIcon size={48} radius="xl" variant="light" color="red">
                  <IconTag size={22} />
                </ThemeIcon>
                <Text fw={700}>Не удалось загрузить промокоды</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Попробуйте обновить страницу чуть позже.
                </Text>
              </Stack>
            </Paper>
          ) : null}

          {!promocodesQuery.isLoading &&
          !promocodesQuery.isError &&
          (promocodesQuery.data?.length ?? 0) === 0 ? (
            <Paper
              radius="xl"
              p="xl"
              style={{ border: '1px dashed rgba(154, 65, 254, 0.22)' }}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon size={52} radius="xl" variant="light" color="brand">
                  <IconTag size={24} />
                </ThemeIcon>
                <Text fw={700}>Промокодов пока нет</Text>
                <Text size="sm" c="dimmed" ta="center" maw={520}>
                  Создайте первый промокод, чтобы он появился в этом списке.
                </Text>
                <Button
                  radius="xl"
                  mt="sm"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => navigate('/app/promocodes/new')}
                >
                  Создать новый промокод
                </Button>
              </Stack>
            </Paper>
          ) : null}

          {!promocodesQuery.isLoading &&
          !promocodesQuery.isError &&
          (promocodesQuery.data?.length ?? 0) > 0 ? (
            <ScrollArea>
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Промокод</Table.Th>
                    <Table.Th>Название</Table.Th>
                    <Table.Th>Сроки</Table.Th>
                    <Table.Th>Скидка</Table.Th>
                    <Table.Th>Статус</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {promocodesQuery.data?.map((promocode) => (
                    <Table.Tr key={promocode.id}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={700}>{promocode.code}</Text>
                          <ActionIcon
                            variant="light"
                            color="brand"
                            radius="xl"
                            onClick={() => handleCopy(promocode.code)}
                            aria-label={`Скопировать ${promocode.code}`}
                          >
                            <IconCopy size={15} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600}>{promocode.title}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{formatPeriod(promocode.starts_on, promocode.ends_on)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{formatDiscount(promocode.discount_mode, promocode.discount_value)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={promocode.status === 'active' ? 'teal' : 'gray'}
                          variant={promocode.status === 'active' ? 'light' : 'outline'}
                        >
                          {promocode.status === 'active' ? 'Активен' : 'Просрочен'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  )
}
