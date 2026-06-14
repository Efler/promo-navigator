import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconCheck,
  IconInfoCircle,
  IconSparkles,
  IconTag,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/use-auth'
import productPlaceholder from '../../assets/product-placeholder.png'
import { ApiError } from '../../shared/api/client'
import {
  formatProductMoney,
  type SellerProductPreviewItem,
  useSellerProductPreviewQuery,
} from '../../features/products/use-seller-product-preview'
import {
  createPromocode,
  getPromocodeCodeAvailability,
  type AudienceType,
  type CodeMode,
  type DiscountMode,
  type ProductScope,
  type PromoType,
} from '../../features/promocodes/api'

type PromocodeFormValues = {
  dateRange: [Date | null, Date | null]
  discountMode: DiscountMode
  discountValue: string
  title: string
  promoType: PromoType
  audience: AudienceType
  productScope: ProductScope
  selectedProductIds: number[]
  codeMode: CodeMode
  manualCode: string
}

const promoTypeOptions: Array<{ value: PromoType; label: string; description: string }> = [
  {
    value: 'single_buyer_single_order',
    label: 'Промокод для 1 покупателя на 1 заказ',
    description:
      'Каждый промокод может быть использован только один раз. После использования он станет недействителен. Такой промокод не получится показать на страницах Wildberries. Рекомендуем использовать такой тип промокодов для призов или блогеров.',
  },
  {
    value: 'all_buyers_once',
    label: 'Промокод для всех покупателей',
    description:
      'Промокод доступен всем покупателям на выбранные категории товаров. Воспользоваться промокодом можно при заказе на любую сумму и только единожды.',
  },
  {
    value: 'all_buyers_limited',
    label: 'Промокод для всех покупателей на любое количество заказов',
    description:
      'Промокод доступен всем покупателям на выбранные категории товаров. Воспользоваться промокодом можно при заказе на любую сумму и ограниченное количество раз.',
  },
]

const audienceOptions: Array<{ value: AudienceType; label: string }> = [
  { value: 'all', label: 'Все' },
  {
    value: 'bought_last_half_year',
    label: 'Кто покупал у вас за последние полгода',
  },
  {
    value: 'not_bought_last_half_year',
    label: 'Кто не покупал у вас за последние полгода',
  },
]

function SelectionOption({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        width: '100%',
      }}
    >
      <Paper
        radius="lg"
        p="md"
        style={{
          border: selected
            ? '1px solid rgba(154, 65, 254, 0.28)'
            : '1px solid rgba(154, 65, 254, 0.1)',
          background: selected ? 'rgba(154, 65, 254, 0.08)' : 'rgba(255, 255, 255, 0.96)',
          transition: 'all 160ms ease',
        }}
      >
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={18}
            radius="xl"
            color={selected ? 'brand' : 'gray'}
            variant={selected ? 'filled' : 'light'}
          >
            {selected ? <IconCheck size={12} /> : null}
          </ThemeIcon>
          <Text fw={600} size="sm">
            {label}
          </Text>
        </Group>
      </Paper>
    </UnstyledButton>
  )
}

function CompactProductCard({
  product,
  selected,
  onToggle,
}: {
  product: SellerProductPreviewItem
  selected: boolean
  onToggle: () => void
}) {
  return (
    <UnstyledButton
      onClick={onToggle}
      style={{
        width: '100%',
        textAlign: 'left',
      }}
    >
      <Paper
        radius="xl"
        p="sm"
        shadow="sm"
        style={{
          height: '100%',
          border: selected
            ? '1px solid rgba(154, 65, 254, 0.36)'
            : '1px solid rgba(154, 65, 254, 0.1)',
          background: selected
            ? 'linear-gradient(180deg, rgba(243,236,255,1) 0%, rgba(255,255,255,1) 100%)'
            : 'rgba(255, 255, 255, 0.98)',
          boxShadow: selected ? '0 16px 30px rgba(154, 65, 254, 0.12)' : undefined,
          transition: 'all 160ms ease',
        }}
      >
        <Group align="start" wrap="nowrap" gap="md">
          <Box
            w={6}
            h={72}
            bg={selected ? 'brand.6' : 'gray.2'}
            style={{ flexShrink: 0, marginTop: 2, borderRadius: 999 }}
          />
          <Image
            src={product.main_photo_url || productPlaceholder}
            alt={product.title}
            radius="lg"
            w={72}
            h={72}
            fit="cover"
          />

          <Stack gap={6} style={{ flex: 1 }}>
            <Group justify="space-between" align="start" gap="xs">
              <Text fw={700} lineClamp={2} style={{ flex: 1 }}>
                {product.title}
              </Text>
              <ThemeIcon
                size={24}
                radius="xl"
                color={selected ? 'brand' : 'gray'}
                variant={selected ? 'filled' : 'light'}
                style={{ flexShrink: 0 }}
              >
                {selected ? <IconCheck size={14} /> : null}
              </ThemeIcon>
            </Group>

            <Group gap="xs">
              {product.brand ? (
                <Badge variant="light" size="sm">
                  {product.brand}
                </Badge>
              ) : null}
              {product.subject_name ? (
                <Badge variant="outline" color="gray" size="sm">
                  {product.subject_name}
                </Badge>
              ) : null}
            </Group>

            <Text size="xs" c="dimmed">
              {product.parent_name ?? 'Без категории'}
            </Text>

            <Group justify="space-between" align="end" gap="sm" mt={2}>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  От цены
                </Text>
                <Text fw={700} size="sm">
                  {formatProductMoney(product.min_discounted_price ?? product.min_price)}
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="right">
                  Остаток
                </Text>
                <Text fw={700} ta="right" size="sm">
                  {product.total_stock_qty} шт.
                </Text>
              </div>
            </Group>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  )
}

function validateDateRange(value: [Date | null, Date | null]) {
  const [start, end] = value

  if (!start) {
    return 'Укажи дату начала акции.'
  }

  if (!end) {
    return 'Укажи дату окончания акции.'
  }

  const startDate = dayjs(start).startOf('day')
  const endDate = dayjs(end).startOf('day')
  const tomorrow = dayjs().add(1, 'day').startOf('day')
  const latestStart = dayjs().add(3, 'month').endOf('day')

  if (startDate.isBefore(tomorrow)) {
    return 'Дата начала должна быть не раньше следующего дня.'
  }

  if (startDate.isAfter(latestStart)) {
    return 'Дата начала должна быть не позже чем через 3 месяца.'
  }

  if (endDate.isBefore(startDate)) {
    return 'Дата окончания должна быть не раньше даты начала.'
  }

  const duration = endDate.diff(startDate, 'day') + 1

  if (duration > 31) {
    return 'Акция по промокоду может идти максимум 31 день.'
  }

  return null
}

function normalizeManualCodeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function serializeDateForApi(value: Date) {
  return dayjs(value).format('YYYY-MM-DD')
}

function getApiErrorDetail(error: unknown) {
  if (!(error instanceof ApiError) || typeof error.data !== 'object' || error.data === null) {
    return null
  }

  const detail = 'detail' in error.data ? (error.data as { detail?: unknown }).detail : null
  return detail ?? null
}

function getApiErrorMessage(detail: unknown) {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const firstItem = detail[0]
    if (typeof firstItem === 'object' && firstItem !== null && 'msg' in firstItem) {
      const message = (firstItem as { msg?: unknown }).msg
      return typeof message === 'string' ? message : null
    }
  }

  return null
}

export function PromocodeConstructorPage() {
  const { seller } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [manualCodeLookupValue, setManualCodeLookupValue] = useState('')

  const form = useForm<PromocodeFormValues>({
    initialValues: {
      dateRange: [null, null],
      discountMode: 'percent',
      discountValue: '',
      title: '',
      promoType: 'single_buyer_single_order',
      audience: 'all',
      productScope: 'all',
      selectedProductIds: [],
      codeMode: 'generate',
      manualCode: '',
    },
    validate: {
      dateRange: validateDateRange,
      discountValue: (value, values) => {
        if (value.trim().length === 0) {
          return 'Укажи значение скидки.'
        }

        if (!/^\d+$/.test(value)) {
          return 'Скидка должна быть целым числом.'
        }

        const numericValue = Number(value)

        if (values.discountMode === 'percent') {
          if (numericValue < 1 || numericValue > 99) {
            return 'Для скидки в процентах допустимы значения от 1 до 99.'
          }
        } else if (numericValue < 1) {
          return 'Для скидки в рублях укажи значение от 1 и выше.'
        }

        return null
      },
      title: (value) => {
        const normalizedValue = value.trim()

        if (normalizedValue.length === 0) {
          return 'Укажи название промокода.'
        }

        if (normalizedValue.length > 50) {
          return 'Название не должно превышать 50 символов.'
        }

        return null
      },
      selectedProductIds: (value, values) => {
        if (values.productScope === 'selected' && value.length === 0) {
          return 'Выбери хотя бы один товар.'
        }

        return null
      },
      manualCode: (value, values) => {
        if (values.codeMode !== 'manual') {
          return null
        }

        if (value.trim().length === 0) {
          return 'Введи промокод вручную.'
        }

        if (!/^[A-Za-z0-9]{4,15}$/.test(value.trim())) {
          return 'Промокод должен содержать от 4 до 15 латинских букв и цифр без других символов.'
        }

        return null
      },
    },
  })

  useEffect(() => {
    if (form.values.productScope === 'all' && form.values.selectedProductIds.length > 0) {
      form.setFieldValue('selectedProductIds', [])
      form.clearFieldError('selectedProductIds')
    }
  }, [form, form.values.productScope, form.values.selectedProductIds.length])

  useEffect(() => {
    if (form.values.codeMode === 'generate' && form.values.manualCode.length > 0) {
      form.setFieldValue('manualCode', '')
      form.clearFieldError('manualCode')
    }
  }, [form, form.values.codeMode, form.values.manualCode.length])

  const normalizedManualCode = normalizeManualCodeInput(form.values.manualCode.trim())
  const isManualCodeReadyForAvailabilityCheck =
    form.values.codeMode === 'manual' && /^[A-Z0-9]{4,15}$/.test(normalizedManualCode)

  useEffect(() => {
    if (!isManualCodeReadyForAvailabilityCheck) {
      setManualCodeLookupValue('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setManualCodeLookupValue(normalizedManualCode)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [isManualCodeReadyForAvailabilityCheck, normalizedManualCode])

  const selectedPromoType =
    promoTypeOptions.find((option) => option.value === form.values.promoType) ??
    promoTypeOptions[0]

  const tomorrow = dayjs().add(1, 'day').startOf('day').toDate()
  const latestStart = dayjs().add(3, 'month').endOf('day').toDate()

  const productsQuery = useSellerProductPreviewQuery({
    sellerId: seller?.id ?? null,
    enabled: form.values.productScope === 'selected',
  })

  useEffect(() => {
    if (form.values.productScope !== 'selected' || !productsQuery.data) {
      return
    }

    const availableProductIds = new Set(productsQuery.data.map((product) => product.id))
    const nextSelectedProductIds = form.values.selectedProductIds.filter((id) =>
      availableProductIds.has(id),
    )

    if (nextSelectedProductIds.length !== form.values.selectedProductIds.length) {
      form.setFieldValue('selectedProductIds', nextSelectedProductIds)
    }
  }, [form, form.values.productScope, form.values.selectedProductIds, productsQuery.data])

  const manualCodeAvailabilityQuery = useQuery({
    queryKey: ['promocode-code-availability', manualCodeLookupValue],
    queryFn: () => getPromocodeCodeAvailability(manualCodeLookupValue),
    enabled: manualCodeLookupValue.length > 0,
    staleTime: 10_000,
  })

  const createPromocodeMutation = useMutation({
    mutationFn: createPromocode,
  })

  const selectedProducts = form.values.selectedProductIds

  function toggleProductSelection(productId: number) {
    const nextValue = selectedProducts.includes(productId)
      ? selectedProducts.filter((id) => id !== productId)
      : [...selectedProducts, productId]

    form.setFieldValue('selectedProductIds', nextValue)
    form.clearFieldError('selectedProductIds')
  }

  async function handleSubmit(values: PromocodeFormValues) {
    const result = form.validate()

    if (result.hasErrors) {
      notifications.show({
        color: 'red',
        title: 'Проверьте форму',
        message: 'Исправьте ошибки в настройках промокода и попробуйте снова.',
      })
      return
    }

    if (values.codeMode === 'manual') {
      const availability = await queryClient.fetchQuery({
        queryKey: ['promocode-code-availability', normalizedManualCode],
        queryFn: () => getPromocodeCodeAvailability(normalizedManualCode),
        staleTime: 10_000,
      })

      if (!availability.is_available) {
        form.setFieldError('manualCode', 'Этот промокод уже занят. Укажи другой код.')
        notifications.show({
          color: 'red',
          title: 'Промокод уже занят',
          message: 'Выберите другой ручной код и повторите создание.',
        })
        return
      }
    }

    try {
      const response = await createPromocodeMutation.mutateAsync({
        title: values.title.trim(),
        starts_on: serializeDateForApi(values.dateRange[0] as Date),
        ends_on: serializeDateForApi(values.dateRange[1] as Date),
        discount_mode: values.discountMode,
        discount_value: Number(values.discountValue),
        promo_type: values.promoType,
        audience_type: values.audience,
        product_scope: values.productScope,
        selected_product_ids:
          values.productScope === 'selected' ? values.selectedProductIds : [],
        code_mode: values.codeMode,
        manual_code:
          values.codeMode === 'manual' ? normalizeManualCodeInput(values.manualCode.trim()) : null,
      })

      form.reset()
      queryClient.invalidateQueries({ queryKey: ['promocodes'] })
      queryClient.removeQueries({ queryKey: ['promocode-code-availability'] })
      notifications.show({
        color: 'brand',
        title: 'Промокод создан',
        message: `Промокод ${response.promocode.code} успешно создан.`,
      })
      navigate('/app/promocodes')
    } catch (error) {
      const detail = getApiErrorDetail(error)
      const detailMessage = getApiErrorMessage(detail)

      if (error instanceof ApiError && error.status === 409 && typeof detailMessage === 'string') {
        if (detailMessage.includes('Promocode with this code already exists')) {
          form.setFieldError('manualCode', 'Этот промокод уже занят. Укажи другой код.')
          notifications.show({
            color: 'red',
            title: 'Промокод уже занят',
            message: 'Укажи другой код и повторите создание.',
          })
          return
        }
      }

      if (typeof detailMessage === 'string') {
        if (detailMessage.includes('selected products')) {
          form.setFieldError(
            'selectedProductIds',
            'Проверьте список товаров: часть выбранных позиций больше недоступна.',
          )
        }

        if (detailMessage.includes('start date')) {
          form.setFieldError('dateRange', detailMessage)
        }
      }

      notifications.show({
        color: 'red',
        title: 'Не удалось создать промокод',
        message:
          typeof detailMessage === 'string'
            ? detailMessage
            : 'Проверьте настройки промокода и попробуйте снова.',
      })
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="xl" maw={1080} mx="auto">
        <Paper
          radius="xl"
          shadow="md"
          p={{ base: 'lg', md: 'xl' }}
          style={{
            border: '1px solid rgba(154, 65, 254, 0.1)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(244,239,252,0.96))',
          }}
        >
          <Stack gap="md">
            <Badge variant="light" color="brand" w="fit-content">
              Промокоды
            </Badge>
            <Title order={1}>Создание промокода</Title>
            <Alert
              radius="lg"
              color="brand"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Акция по промокоду может идти максимум 31 день. Дата начала не раньше
              следующего дня после создания и не позже 3 месяцев. Название может быть
              любым - его увидите только вы.
            </Alert>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mt="xs">
              <div>
                <Text fw={600} size="sm" mb={10}>
                  Даты проведения акции
                </Text>
                <DatePickerInput
                  placeholder="Выберите период"
                  type="range"
                  locale="ru"
                  firstDayOfWeek={1}
                  valueFormat="DD.MM.YYYY"
                  minDate={tomorrow}
                  maxDate={latestStart}
                  allowSingleDateInRange
                  {...form.getInputProps('dateRange')}
                />
              </div>

              <div>
                <Text fw={600} size="sm" mb={10}>
                  Скидка
                </Text>
                <Group align="start" gap="sm" wrap="nowrap">
                  <SegmentedControl
                    data={[
                      { label: '%', value: 'percent' },
                      { label: '₽', value: 'amount' },
                    ]}
                    value={form.values.discountMode}
                    onChange={(value) =>
                      form.setFieldValue('discountMode', value as DiscountMode)
                    }
                  />
                  <TextInput
                    placeholder="0"
                    inputMode="numeric"
                    style={{ flex: 1 }}
                    value={form.values.discountValue}
                    error={form.errors.discountValue}
                    onBlur={() => form.validateField('discountValue')}
                    onChange={(event) =>
                      form.setFieldValue(
                        'discountValue',
                        event.currentTarget.value.replace(/[^\d]/g, ''),
                      )
                    }
                  />
                </Group>
              </div>

              <div>
                <Group justify="space-between" align="end" mb={10}>
                  <Text fw={600} size="sm">
                    Название
                  </Text>
                  <Text size="xs" c="dimmed">
                    {form.values.title.length}/50
                  </Text>
                </Group>
                <TextInput
                  placeholder="Например, Весенний промокод"
                  maxLength={50}
                  {...form.getInputProps('title')}
                />
              </div>
            </SimpleGrid>
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          p={{ base: 'lg', md: 'xl' }}
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Stack gap="lg">
            <Title order={3}>Тип промокода</Title>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
              <Stack gap="sm">
                {promoTypeOptions.map((option) => (
                  <SelectionOption
                    key={option.value}
                    label={option.label}
                    selected={form.values.promoType === option.value}
                    onClick={() => form.setFieldValue('promoType', option.value)}
                  />
                ))}
              </Stack>

              <Paper
                radius="xl"
                p="lg"
                bg="brand.0"
                style={{
                  border: '1px solid rgba(154, 65, 254, 0.16)',
                }}
              >
                <Stack gap="sm">
                  <Text fw={700}>{selectedPromoType.label}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedPromoType.description}
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          p={{ base: 'lg', md: 'xl' }}
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Stack gap="lg">
            <div>
              <Title order={3}>Аудитория</Title>
              <Text c="dimmed" mt="sm">
                Выберите, кому будет доступен промокод.
              </Text>
            </div>

            <Stack gap="sm">
              {audienceOptions.map((option) => (
                <SelectionOption
                  key={option.value}
                  label={option.label}
                  selected={form.values.audience === option.value}
                  onClick={() => form.setFieldValue('audience', option.value)}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          p={{ base: 'lg', md: 'xl' }}
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Stack gap="lg">
            <div>
              <Title order={3}>Товары</Title>
            </div>

            <SegmentedControl
              value={form.values.productScope}
              onChange={(value) =>
                form.setFieldValue('productScope', value as ProductScope)
              }
              data={[
                { label: 'Все', value: 'all' },
                { label: 'Некоторые', value: 'selected' },
              ]}
              w="fit-content"
            />

            {form.values.productScope === 'all' ? (
              <Text c="dimmed">
                Покупатели смогут применять промокод ко всем текущим товарам и тем,
                которые появятся после создания акции.
              </Text>
            ) : (
              <Stack gap="md">
                <Group justify="space-between" align="end" gap="sm">
                  <div>
                    <Text fw={600}>Выберите товары</Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      Промокод будет действовать только на выбранные позиции.
                    </Text>
                  </div>
                  <Badge color="brand" variant="light">
                    Выбрано: {selectedProducts.length}
                  </Badge>
                </Group>

                {form.errors.selectedProductIds ? (
                  <Text size="sm" c="red">
                    {form.errors.selectedProductIds}
                  </Text>
                ) : null}

                {productsQuery.isLoading ? (
                  <Stack
                    gap="sm"
                    style={{
                      maxHeight: 520,
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {[1, 2, 3, 4].map((item) => (
                      <Paper
                        key={item}
                        p="sm"
                        radius="xl"
                        shadow="sm"
                        style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
                      >
                        <Group align="start" wrap="nowrap" gap="md">
                          <Skeleton height={72} width={6} radius="xl" />
                          <Skeleton height={72} width={72} radius="lg" />
                          <Stack gap="sm" style={{ flex: 1 }}>
                            <Skeleton height={18} radius="md" />
                            <Skeleton height={14} width="70%" radius="md" />
                            <Skeleton height={14} width="50%" radius="md" />
                          </Stack>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : null}

                {!productsQuery.isLoading && productsQuery.isError ? (
                  <Alert radius="lg" color="red" variant="light">
                    Не удалось загрузить товары продавца. Попробуйте чуть позже.
                  </Alert>
                ) : null}

                {!productsQuery.isLoading &&
                !productsQuery.isError &&
                (productsQuery.data?.length ?? 0) === 0 ? (
                  <Paper
                    radius="xl"
                    p="xl"
                    style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
                  >
                    <Stack align="center" gap="sm">
                      <ThemeIcon size={48} radius="xl" variant="light" color="brand">
                        <IconSparkles size={22} />
                      </ThemeIcon>
                      <Text fw={700}>Товары не найдены</Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Сейчас в каталоге нет товаров, которые можно выбрать для промокода.
                      </Text>
                    </Stack>
                  </Paper>
                ) : null}

                {!productsQuery.isLoading &&
                !productsQuery.isError &&
                (productsQuery.data?.length ?? 0) > 0 ? (
                  <Stack
                    gap="sm"
                    style={{
                      maxHeight: 520,
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {productsQuery.data?.map((product) => (
                      <CompactProductCard
                        key={product.id}
                        product={product}
                        selected={selectedProducts.includes(product.id)}
                        onToggle={() => toggleProductSelection(product.id)}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          p={{ base: 'lg', md: 'xl' }}
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Stack gap="lg">
            <Title order={3}>Промокод</Title>

            <SegmentedControl
              value={form.values.codeMode}
              onChange={(value) => form.setFieldValue('codeMode', value as CodeMode)}
              data={[
                { label: 'Сгенерировать', value: 'generate' },
                { label: 'Ввести вручную', value: 'manual' },
              ]}
              w="fit-content"
            />

            {form.values.codeMode === 'generate' ? (
              <Text c="dimmed">
                Автоматически сгенерируем промокод, когда вы нажмете кнопку «Создать
                промокод».
              </Text>
            ) : (
              <Stack gap="sm">
                <Text c="dimmed">
                  Введите от 4 до 15 латинских букв и цифр без других символов. Сообщим,
                  если введенный промокод занят, когда нажмете кнопку «Создать промокод»
                  — его нужно будет заменить.
                </Text>
                <TextInput
                  label="Промокод"
                  placeholder="Например, SALE2026"
                  maxLength={15}
                  leftSection={<IconTag size={16} />}
                  value={form.values.manualCode}
                  error={form.errors.manualCode}
                  onBlur={() => form.validateField('manualCode')}
                  onChange={(event) => {
                    form.clearFieldError('manualCode')
                    form.setFieldValue(
                      'manualCode',
                      normalizeManualCodeInput(event.currentTarget.value),
                    )
                  }}
                />
                {form.values.manualCode.length > 0 && !form.errors.manualCode ? (
                  <Text
                    size="sm"
                    c={
                      manualCodeAvailabilityQuery.data?.is_available
                        ? 'teal'
                        : manualCodeAvailabilityQuery.data?.is_available === false
                          ? 'red'
                          : 'dimmed'
                    }
                  >
                    {manualCodeAvailabilityQuery.isFetching
                      ? 'Проверяем доступность промокода...'
                      : manualCodeAvailabilityQuery.data?.is_available
                        ? `Промокод ${manualCodeAvailabilityQuery.data.normalized_code} свободен.`
                        : manualCodeAvailabilityQuery.data?.is_available === false
                          ? 'Этот промокод уже занят.'
                          : 'Промокод будет проверен перед созданием.'}
                  </Text>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Box>
          <Button
            type="submit"
            size="lg"
            variant="gradient"
            gradient={{ from: 'brand.5', to: 'brand.7', deg: 90 }}
            radius="xl"
            fullWidth
            styles={{
              root: {
                minHeight: 58,
                boxShadow: '0 16px 30px rgba(154, 65, 254, 0.18)',
                transition: 'transform 160ms ease, box-shadow 160ms ease, filter 160ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 20px 38px rgba(154, 65, 254, 0.24)',
                  filter: 'saturate(1.05)',
                },
              },
              inner: {
                justifyContent: 'center',
              },
            }}
            loading={createPromocodeMutation.isPending}
          >
            + Создать промокод
          </Button>
        </Box>
      </Stack>
    </form>
  )
}
