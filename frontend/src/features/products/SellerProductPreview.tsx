import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconBoxSeam, IconChevronDown, IconSparkles } from '@tabler/icons-react'
import productPlaceholder from '../../assets/product-placeholder.png'
import {
  formatProductMoney,
  useSellerProductPreviewQuery,
} from './use-seller-product-preview'

type SellerProductPreviewProps = {
  sellerId: number | null
}

export function SellerProductPreview({ sellerId }: SellerProductPreviewProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(false)
  }, [sellerId])

  const productsQuery = useSellerProductPreviewQuery({
    sellerId,
    enabled: isVisible,
  })

  async function handleRevealProducts() {
    if (!isVisible) {
      setIsVisible(true)
      return
    }

    await productsQuery.refetch()
  }

  const products = productsQuery.data ?? []
  const isInitialLoading = isVisible && productsQuery.isLoading
  const isRefreshing = products.length > 0 && productsQuery.isRefetching

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" style={{ alignItems: 'start' }}>
      <Box>
        <Paper
          p={{ base: 'lg', md: 'xl' }}
          radius="xl"
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Stack gap="lg">
            <div>
              <Title order={4}>Ассортимент продавца</Title>
              <Text c="dimmed" mt="sm">
                Откройте список товаров, чтобы быстро посмотреть ассортимент,
                цены и остатки.
              </Text>
            </div>

            <SimpleGrid cols={1} spacing="sm">
              <Paper radius="lg" p="md" bg="brand.0">
                <Text fw={700}>В списке</Text>
                <Text size="sm" c="dimmed" mt={6}>
                  Название, бренд, категория, размеры, цены и остатки по товарам.
                </Text>
              </Paper>
              <Paper radius="lg" p="md" bg="brand.0">
                <Text fw={700}>Обновление</Text>
                <Text size="sm" c="dimmed" mt={6}>
                  Нажмите кнопку еще раз, чтобы получить актуальные данные по списку.
                </Text>
              </Paper>
            </SimpleGrid>

            <Button
              size="md"
              color="brand"
              leftSection={<IconBoxSeam size={18} />}
              rightSection={<IconChevronDown size={16} />}
              loading={productsQuery.isFetching}
              onClick={handleRevealProducts}
            >
              {isVisible ? 'Обновить список' : 'Показать товары продавца'}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Box>
        {!isVisible ? (
          <Paper
            p="xl"
            radius="xl"
            shadow="sm"
            style={{
              border: '1px dashed rgba(154, 65, 254, 0.32)',
              background:
                'linear-gradient(180deg, rgba(247,247,250,1) 0%, rgba(255,255,255,1) 100%)',
            }}
          >
            <Stack align="center" gap="sm" py="xl">
              <ThemeIcon size={54} radius="xl" variant="light" color="brand">
                <IconSparkles size={26} />
              </ThemeIcon>
              <Title order={4}>Список товаров</Title>
              <Text c="dimmed" ta="center" maw={520}>
                Нажмите кнопку слева, чтобы открыть ассортимент продавца.
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {isInitialLoading ? (
          <Stack gap="md">
            {[1, 2, 3].map((item) => (
              <Paper
                key={item}
                p="lg"
                radius="xl"
                shadow="sm"
                style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
              >
                <Stack gap="md">
                  <Skeleton height={28} radius="md" />
                  <Skeleton height={16} width="70%" radius="md" />
                  <Skeleton height={84} radius="lg" />
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : null}

        {!isInitialLoading && productsQuery.isError ? (
          <Alert
            radius="xl"
            color="red"
            variant="light"
            icon={<IconAlertCircle size={18} />}
            title="Не удалось загрузить товары"
          >
            Попробуйте обновить список чуть позже.
          </Alert>
        ) : null}

        {!isInitialLoading && !productsQuery.isError && isVisible && products.length === 0 ? (
          <Paper
            p="xl"
            radius="xl"
            shadow="sm"
            style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
          >
            <Stack align="center" gap="sm" py="lg">
              <Title order={4}>Товары не найдены</Title>
              <Text c="dimmed" ta="center">
                В каталоге пока нет товаров для отображения.
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {!productsQuery.isError && products.length > 0 ? (
          <Stack gap="md" style={{ opacity: isRefreshing ? 0.94 : 1, transition: 'opacity 180ms ease' }}>
            {products.map((product) => (
              <Card
                key={product.id}
                padding="lg"
                radius="xl"
                shadow="sm"
                style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
              >
                <Group align="start" wrap="nowrap" gap="lg">
                  <Image
                    src={product.main_photo_url || productPlaceholder}
                    alt={product.title}
                    radius="lg"
                    w={220}
                    h={160}
                    fit="cover"
                  />

                  <Stack gap="md" style={{ flex: 1 }}>
                    <Group justify="space-between" align="start" gap="md">
                      <div>
                        <Title order={4}>{product.title}</Title>
                        <Group gap="xs" mt={8}>
                          {product.brand ? <Badge variant="light">{product.brand}</Badge> : null}
                          {product.subject_name ? (
                            <Badge variant="outline" color="gray">
                              {product.subject_name}
                            </Badge>
                          ) : null}
                          {product.parent_name ? (
                            <Badge variant="outline" color="brand">
                              {product.parent_name}
                            </Badge>
                          ) : null}
                        </Group>
                      </div>

                      <Badge color={product.is_active ? 'green' : 'gray'} variant="light">
                        {product.is_active ? 'Активен' : 'Скрыт'}
                      </Badge>
                    </Group>

                    <Text c="dimmed" lineClamp={2}>
                      {product.description ?? 'Описание товара не указано.'}
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                      <Paper radius="lg" p="sm" bg="gray.0">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          От цены
                        </Text>
                        <Text fw={700} mt={4}>
                          {formatProductMoney(
                            product.min_discounted_price ?? product.min_price,
                          )}
                        </Text>
                        {product.min_discounted_price ? (
                          <Text size="sm" c="dimmed">
                            Базовая: {formatProductMoney(product.min_price)}
                          </Text>
                        ) : null}
                      </Paper>

                      <Paper radius="lg" p="sm" bg="gray.0">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Остаток
                        </Text>
                        <Text fw={700} mt={4}>
                          {product.total_stock_qty} шт.
                        </Text>
                        <Text size="sm" c="dimmed">
                          Позиций: {product.item_count}
                        </Text>
                      </Paper>

                      <Paper radius="lg" p="sm" bg="gray.0">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Макс. скидка
                        </Text>
                        <Text fw={700} mt={4}>
                          {product.max_discount_percent}%
                        </Text>
                        <Text size="sm" c="dimmed">
                          Среди доступных размеров
                        </Text>
                      </Paper>
                    </SimpleGrid>

                    <div>
                      <Text size="sm" fw={600} mb={8}>
                        Размеры
                      </Text>
                      <Group gap="xs">
                        {product.sizes.map((size) => (
                          <Badge
                            key={`${product.id}-${size}`}
                            radius="sm"
                            variant="light"
                            color="brand"
                          >
                            {size}
                          </Badge>
                        ))}
                      </Group>
                    </div>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : null}
      </Box>
    </SimpleGrid>
  )
}
