import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import {
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
import { IconGift, IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useBundlesQuery } from '../../features/bundles/use-bundles'
import type { BundleBenefitType } from '../../features/bundles/api'

const benefitTypeLabels: Record<BundleBenefitType, string> = {
  gift_item: 'Подарок за набор',
  order_discount: 'Скидка на комплект',
  fixed_price: 'Фиксированная цена',
  step_discount: 'Скидка на следующий товар',
  pair_discount: 'Скидка на пару товаров',
}

function formatPeriod(startsOn: string, endsOn: string) {
  return `${dayjs(startsOn).format('DD.MM.YYYY')} - ${dayjs(endsOn).format('DD.MM.YYYY')}`
}

function getStatusLabel(status: 'active' | 'expired' | 'planned') {
  if (status === 'active') {
    return 'Активен'
  }

  if (status === 'planned') {
    return 'Запланирован'
  }

  return 'Просрочен'
}

function getStatusColor(status: 'active' | 'expired' | 'planned') {
  if (status === 'active') {
    return 'teal'
  }

  if (status === 'planned') {
    return 'brand'
  }

  return 'gray'
}

export function BundleListPage() {
  const navigate = useNavigate()
  const bundlesQuery = useBundlesQuery()
  const bundles = bundlesQuery.data?.items ?? []

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
              Комплекты
            </Badge>
            <Title order={1}>Комплекты продавца</Title>
            <Text c="dimmed" mt="sm" maw={760}>
              Управляйте товарными наборами, комбинированными предложениями и
              условиями скидок, которые помогают увеличивать средний чек.
            </Text>
          </div>

          <Button
            size="md"
            radius="xl"
            leftSection={<IconPlus size={18} />}
            onClick={() => navigate('/app/bundles/new')}
          >
            Создать новый комплект
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
              <Title order={3}>Существующие комплекты</Title>
              <Text c="dimmed" mt="sm">
                Здесь будут отображаться все комплекты, созданные в кабинете продавца.
              </Text>
            </div>
            {bundlesQuery.isFetching && !bundlesQuery.isLoading ? (
              <Text size="sm" c="dimmed">
                Обновляем список...
              </Text>
            ) : null}
          </Group>

          {bundlesQuery.isLoading ? (
            <Group justify="center" py="xl">
              <Loader color="brand" />
            </Group>
          ) : null}

          {!bundlesQuery.isLoading && bundlesQuery.isError ? (
            <Paper radius="xl" p="xl" bg="red.0">
              <Stack align="center" gap="sm">
                <ThemeIcon size={48} radius="xl" variant="light" color="red">
                  <IconGift size={22} />
                </ThemeIcon>
                <Text fw={700}>Не удалось загрузить комплекты</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Попробуйте обновить страницу чуть позже.
                </Text>
              </Stack>
            </Paper>
          ) : null}

          {!bundlesQuery.isLoading && !bundlesQuery.isError && bundles.length === 0 ? (
            <Paper
              radius="xl"
              p="xl"
              style={{ border: '1px dashed rgba(154, 65, 254, 0.22)' }}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon size={52} radius="xl" variant="light" color="brand">
                  <IconGift size={24} />
                </ThemeIcon>
                <Text fw={700}>Комплектов пока нет</Text>
                <Text size="sm" c="dimmed" ta="center" maw={560}>
                  Создайте первый комплект, чтобы настроить условия покупки нескольких
                  товаров в одном предложении.
                </Text>
                <Button
                  radius="xl"
                  mt="sm"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => navigate('/app/bundles/new')}
                >
                  Создать новый комплект
                </Button>
              </Stack>
            </Paper>
          ) : null}

          {!bundlesQuery.isLoading && !bundlesQuery.isError && bundles.length > 0 ? (
            <ScrollArea>
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Название</Table.Th>
                    <Table.Th>Механика</Table.Th>
                    <Table.Th>Сроки</Table.Th>
                    <Table.Th>Товары</Table.Th>
                    <Table.Th>Статус</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bundles.map((bundle) => (
                    <Table.Tr key={bundle.id}>
                      <Table.Td>
                        <Text fw={600}>{bundle.title}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text>{benefitTypeLabels[bundle.benefit_type]}</Text>
                          <Text size="xs" c="dimmed">
                            {bundle.benefit_label}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text>{formatPeriod(bundle.starts_on, bundle.ends_on)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>
                          {bundle.product_scope === 'all'
                            ? 'Все товары'
                            : `${bundle.selected_product_ids.length} выбрано`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getStatusColor(bundle.status)}
                          variant={bundle.status === 'expired' ? 'outline' : 'light'}
                        >
                          {getStatusLabel(bundle.status)}
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
