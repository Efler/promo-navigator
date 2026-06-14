import { useEffect } from 'react'
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
  Select,
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
import { IconCheck, IconGift, IconInfoCircle, IconSparkles } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import productPlaceholder from '../../assets/product-placeholder.png'
import { useAuth } from '../../features/auth/use-auth'
import type {
  BundleAudienceType,
  BundleBenefitType,
  BundleProductScope,
} from '../../features/bundles/api'
import {
  formatProductMoney,
  type SellerProductPreviewItem,
  useSellerProductPreviewQuery,
} from '../../features/products/use-seller-product-preview'

type BundleFormValues = {
  dateRange: [Date | null, Date | null]
  title: string
  benefitType: BundleBenefitType
  buyQuantity: string
  giftQuantity: string
  discountPercent: string
  fixedPrice: string
  stepStartPosition: string
  stepDiscountPercent: string
  pairProductXId: string
  pairProductYId: string
  pairDiscountPercent: string
  audience: BundleAudienceType
  productScope: BundleProductScope
  selectedProductIds: number[]
}

const benefitTypeOptions: Array<{
  value: BundleBenefitType
  label: string
  description: string
}> = [
  {
    value: 'gift_item',
    label: 'Купи N, получи товар в подарок',
    description:
      'Покупатель собирает корзину из нужного количества товаров, а дополнительная позиция идет как подарок.',
  },
  {
    value: 'order_discount',
    label: 'Купи N товаров, получи скидку %',
    description:
      'Скидка применяется к итоговой сумме комплекта, когда покупатель набирает нужное количество товаров.',
  },
  {
    value: 'fixed_price',
    label: 'Комплект по фиксированной цене',
    description:
      'Покупатель получает набор выбранных товаров по заранее заданной итоговой цене.',
  },
  {
    value: 'step_discount',
    label: 'Скидка на каждый следующий товар',
    description:
      'Скидка применяется к позициям, начиная с выбранного номера товара в комплекте.',
  },
  {
    value: 'pair_discount',
    label: 'Товар X + товар Y - скидка',
    description:
      'Покупатель получает скидку, когда добавляет в заказ два конкретных товара из заданной пары.',
  },
]

const audienceOptions: Array<{ value: BundleAudienceType; label: string }> = [
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
    <UnstyledButton onClick={onClick} style={{ width: '100%' }}>
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
    <UnstyledButton onClick={onToggle} style={{ width: '100%', textAlign: 'left' }}>
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

  if (startDate.isBefore(tomorrow)) {
    return 'Дата начала должна быть не раньше следующего дня.'
  }

  if (endDate.isBefore(startDate)) {
    return 'Дата окончания должна быть не раньше даты начала.'
  }

  return null
}

function validatePositiveInteger(value: string, message: string) {
  if (value.trim().length === 0) {
    return message
  }

  if (!/^\d+$/.test(value) || Number(value) < 1) {
    return 'Укажите целое число от 1 и выше.'
  }

  return null
}

function validatePercent(value: string) {
  const integerError = validatePositiveInteger(value, 'Укажите процент скидки.')

  if (integerError) {
    return integerError
  }

  const numericValue = Number(value)

  if (numericValue < 1 || numericValue > 99) {
    return 'Допустимый процент скидки - от 1 до 99.'
  }

  return null
}

function getDigitsOnly(value: string) {
  return value.replace(/[^\d]/g, '')
}

function formatMoneyFromInput(value: string) {
  if (!value) {
    return 'не указана'
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function BundleConstructorPage() {
  const { seller } = useAuth()
  const navigate = useNavigate()

  const form = useForm<BundleFormValues>({
    initialValues: {
      dateRange: [null, null],
      title: '',
      benefitType: 'gift_item',
      buyQuantity: '2',
      giftQuantity: '1',
      discountPercent: '30',
      fixedPrice: '',
      stepStartPosition: '2',
      stepDiscountPercent: '20',
      pairProductXId: '',
      pairProductYId: '',
      pairDiscountPercent: '15',
      audience: 'all',
      productScope: 'all',
      selectedProductIds: [],
    },
    validate: {
      dateRange: validateDateRange,
      title: (value) => {
        const normalizedValue = value.trim()

        if (normalizedValue.length === 0) {
          return 'Укажи название комплекта.'
        }

        if (normalizedValue.length > 60) {
          return 'Название не должно превышать 60 символов.'
        }

        return null
      },
      buyQuantity: (value, values) =>
        values.benefitType === 'pair_discount'
          ? null
          : validatePositiveInteger(value, 'Укажите количество товаров.'),
      giftQuantity: (value, values) =>
        values.benefitType === 'gift_item'
          ? validatePositiveInteger(value, 'Укажите количество подарков.')
          : null,
      discountPercent: (value, values) =>
        values.benefitType === 'order_discount' ? validatePercent(value) : null,
      fixedPrice: (value, values) =>
        values.benefitType === 'fixed_price'
          ? validatePositiveInteger(value, 'Укажите фиксированную цену комплекта.')
          : null,
      stepDiscountPercent: (value, values) =>
        values.benefitType === 'step_discount' ? validatePercent(value) : null,
      stepStartPosition: (value, values) =>
        values.benefitType === 'step_discount'
          ? validatePositiveInteger(value, 'Укажите номер товара, с которого действует скидка.') ??
            (Number(value) > Number(values.buyQuantity)
              ? 'Номер товара не должен быть больше минимума товаров в комплекте.'
              : null)
          : null,
      pairProductXId: (value, values) => {
        if (values.benefitType !== 'pair_discount') {
          return null
        }

        return value ? null : 'Выберите товар X.'
      },
      pairProductYId: (value, values) => {
        if (values.benefitType !== 'pair_discount') {
          return null
        }

        if (!value) {
          return 'Выберите товар Y.'
        }

        if (value === values.pairProductXId) {
          return 'Товар Y должен отличаться от товара X.'
        }

        return null
      },
      pairDiscountPercent: (value, values) =>
        values.benefitType === 'pair_discount' ? validatePercent(value) : null,
      selectedProductIds: (value, values) => {
        if (
          values.benefitType !== 'pair_discount' &&
          values.productScope === 'selected' &&
          value.length === 0
        ) {
          return 'Выбери хотя бы один товар.'
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

  const productsQuery = useSellerProductPreviewQuery({
    sellerId: seller?.id ?? null,
    enabled: form.values.productScope === 'selected' || form.values.benefitType === 'pair_discount',
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

  const selectedBenefitType =
    benefitTypeOptions.find((option) => option.value === form.values.benefitType) ??
    benefitTypeOptions[0]
  const selectedProducts = form.values.selectedProductIds
  const productSelectOptions =
    productsQuery.data?.map((product) => ({
      value: String(product.id),
      label: `${product.title}${product.brand ? `, ${product.brand}` : ''}`,
    })) ?? []
  const pairProductX = productsQuery.data?.find(
    (product) => String(product.id) === form.values.pairProductXId,
  )
  const pairProductY = productsQuery.data?.find(
    (product) => String(product.id) === form.values.pairProductYId,
  )
  const tomorrow = dayjs().add(1, 'day').startOf('day').toDate()

  function toggleProductSelection(productId: number) {
    const nextValue = selectedProducts.includes(productId)
      ? selectedProducts.filter((id) => id !== productId)
      : [...selectedProducts, productId]

    form.setFieldValue('selectedProductIds', nextValue)
    form.clearFieldError('selectedProductIds')
  }

  function getBenefitSummary() {
    if (form.values.benefitType === 'gift_item') {
      return `Купить ${form.values.buyQuantity || 'N'} шт., получить ${
        form.values.giftQuantity || 'N'
      } шт. в подарок`
    }

    if (form.values.benefitType === 'order_discount') {
      return `Купить ${form.values.buyQuantity || 'N'} шт. и получить скидку ${
        form.values.discountPercent || 'N'
      }% на комплект`
    }

    if (form.values.benefitType === 'fixed_price') {
      return `Купить ${form.values.buyQuantity || 'N'} шт. по итоговой цене ${formatMoneyFromInput(
        form.values.fixedPrice,
      )}`
    }

    if (form.values.benefitType === 'step_discount') {
      return `При покупке от ${form.values.buyQuantity || 'N'} шт. скидка ${
        form.values.stepDiscountPercent || 'N'
      }% действует с ${form.values.stepStartPosition || 'N'}-го товара`
    }

    return `Скидка ${form.values.pairDiscountPercent || 'N'}% при покупке пары товар X + товар Y`
  }

  function handleSubmit(values: BundleFormValues) {
    const result = form.validate()

    if (result.hasErrors) {
      notifications.show({
        color: 'red',
        title: 'Проверьте форму',
        message: 'Исправьте ошибки в настройках комплекта и попробуйте снова.',
      })
      return
    }

    notifications.show({
      color: 'brand',
      title: 'Комплект настроен',
      message: `Настройки "${values.title.trim()}" готовы к запуску.`,
    })
    navigate('/app/bundles')
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
              Комплекты
            </Badge>
            <Title order={1}>Создание комплекта</Title>
            <Alert
              radius="lg"
              color="brand"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Настройте механику выгоды, период действия и товары, которые будут
              участвовать в предложении.
            </Alert>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="xs">
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
                  allowSingleDateInRange
                  {...form.getInputProps('dateRange')}
                />
              </div>

              <div>
                <Group justify="space-between" align="end" mb={10}>
                  <Text fw={600} size="sm">
                    Название
                  </Text>
                  <Text size="xs" c="dimmed">
                    {form.values.title.length}/60
                  </Text>
                </Group>
                <TextInput
                  placeholder="Например, Набор для ухода"
                  maxLength={60}
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
            <Title order={3}>Тип выгоды</Title>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
              <Stack gap="sm">
                {benefitTypeOptions.map((option) => (
                  <SelectionOption
                    key={option.value}
                    label={option.label}
                    selected={form.values.benefitType === option.value}
                    onClick={() => form.setFieldValue('benefitType', option.value)}
                  />
                ))}
              </Stack>

              <Paper
                radius="xl"
                p="lg"
                bg="brand.0"
                style={{ border: '1px solid rgba(154, 65, 254, 0.16)' }}
              >
                <Stack gap="sm">
                  <Text fw={700}>{selectedBenefitType.label}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedBenefitType.description}
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
              <Title order={3}>Параметры выгоды</Title>
              <Text c="dimmed" mt="sm">
                Укажите, сколько товаров должен купить покупатель и какую выгоду он
                получит.
              </Text>
            </div>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {form.values.benefitType !== 'pair_discount' ? (
                <TextInput
                  label={
                    form.values.benefitType === 'step_discount'
                      ? 'Минимум товаров в комплекте'
                      : 'Количество товаров'
                  }
                  placeholder="2"
                  inputMode="numeric"
                  value={form.values.buyQuantity}
                  error={form.errors.buyQuantity}
                  onBlur={() => form.validateField('buyQuantity')}
                  onChange={(event) =>
                    form.setFieldValue('buyQuantity', getDigitsOnly(event.currentTarget.value))
                  }
                />
              ) : null}

              {form.values.benefitType === 'gift_item' ? (
                <TextInput
                  label="Подарочных товаров"
                  placeholder="1"
                  inputMode="numeric"
                  value={form.values.giftQuantity}
                  error={form.errors.giftQuantity}
                  onBlur={() => form.validateField('giftQuantity')}
                  onChange={(event) =>
                    form.setFieldValue('giftQuantity', getDigitsOnly(event.currentTarget.value))
                  }
                />
              ) : null}

              {form.values.benefitType === 'order_discount' ? (
                <TextInput
                  label="Скидка на комплект, %"
                  placeholder="30"
                  inputMode="numeric"
                  value={form.values.discountPercent}
                  error={form.errors.discountPercent}
                  onBlur={() => form.validateField('discountPercent')}
                  onChange={(event) =>
                    form.setFieldValue('discountPercent', getDigitsOnly(event.currentTarget.value))
                  }
                />
              ) : null}

              {form.values.benefitType === 'fixed_price' ? (
                <TextInput
                  label="Итоговая цена, ₽"
                  placeholder="1990"
                  inputMode="numeric"
                  value={form.values.fixedPrice}
                  error={form.errors.fixedPrice}
                  onBlur={() => form.validateField('fixedPrice')}
                  onChange={(event) =>
                    form.setFieldValue('fixedPrice', getDigitsOnly(event.currentTarget.value))
                  }
                />
              ) : null}

              {form.values.benefitType === 'step_discount' ? (
                <>
                  <TextInput
                    label="С какого товара скидка"
                    placeholder="2"
                    inputMode="numeric"
                    value={form.values.stepStartPosition}
                    error={form.errors.stepStartPosition}
                    onBlur={() => form.validateField('stepStartPosition')}
                    onChange={(event) =>
                      form.setFieldValue(
                        'stepStartPosition',
                        getDigitsOnly(event.currentTarget.value),
                      )
                    }
                  />
                  <TextInput
                    label="Скидка на эти товары, %"
                    placeholder="20"
                    inputMode="numeric"
                    value={form.values.stepDiscountPercent}
                    error={form.errors.stepDiscountPercent}
                    onBlur={() => form.validateField('stepDiscountPercent')}
                    onChange={(event) =>
                      form.setFieldValue(
                        'stepDiscountPercent',
                        getDigitsOnly(event.currentTarget.value),
                      )
                    }
                  />
                </>
              ) : null}

              {form.values.benefitType === 'pair_discount' ? (
                <TextInput
                  label="Скидка на пару, %"
                  placeholder="15"
                  inputMode="numeric"
                  value={form.values.pairDiscountPercent}
                  error={form.errors.pairDiscountPercent}
                  onBlur={() => form.validateField('pairDiscountPercent')}
                  onChange={(event) =>
                    form.setFieldValue('pairDiscountPercent', getDigitsOnly(event.currentTarget.value))
                  }
                />
              ) : null}
            </SimpleGrid>

            {form.values.benefitType === 'step_discount' ? (
              <Paper radius="lg" p="md" bg="brand.0">
                <Text size="sm" c="dimmed">
                  Например, если минимум товаров равен 3, скидка начинается со 2-го
                  товара и размер скидки 20%, то первый товар остается по обычной цене,
                  а второй и третий получают скидку 20%.
                </Text>
              </Paper>
            ) : null}
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
                Выберите, кому будет доступен комплект.
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
            <Title order={3}>Товары</Title>

            {form.values.benefitType === 'pair_discount' ? (
              <Stack gap="md">
                <Text c="dimmed">
                  Выберите два разных товара. Скидка будет применяться только при
                  совместной покупке этой пары.
                </Text>

                {productsQuery.isLoading ? (
                  <Stack gap="sm">
                    <Skeleton height={42} radius="md" />
                    <Skeleton height={42} radius="md" />
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
                        Сейчас в каталоге нет товаров, которые можно выбрать для комплекта.
                      </Text>
                    </Stack>
                  </Paper>
                ) : null}

                {!productsQuery.isLoading &&
                !productsQuery.isError &&
                (productsQuery.data?.length ?? 0) > 0 ? (
                  <Stack gap="md">
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                      <Select
                        label="Товар X"
                        placeholder="Выберите первый товар"
                        searchable
                        data={productSelectOptions}
                        value={form.values.pairProductXId}
                        error={form.errors.pairProductXId}
                        onChange={(value) => {
                          form.setFieldValue('pairProductXId', value ?? '')
                          form.clearFieldError('pairProductXId')
                          form.clearFieldError('pairProductYId')
                        }}
                      />
                      <Select
                        label="Товар Y"
                        placeholder="Выберите второй товар"
                        searchable
                        data={productSelectOptions}
                        value={form.values.pairProductYId}
                        error={form.errors.pairProductYId}
                        onChange={(value) => {
                          form.setFieldValue('pairProductYId', value ?? '')
                          form.clearFieldError('pairProductYId')
                        }}
                      />
                    </SimpleGrid>

                    {pairProductX || pairProductY ? (
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                        {pairProductX ? (
                          <CompactProductCard
                            product={pairProductX}
                            selected
                            onToggle={() => form.setFieldValue('pairProductXId', '')}
                          />
                        ) : null}
                        {pairProductY ? (
                          <CompactProductCard
                            product={pairProductY}
                            selected
                            onToggle={() => form.setFieldValue('pairProductYId', '')}
                          />
                        ) : null}
                      </SimpleGrid>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <>
                <SegmentedControl
                  value={form.values.productScope}
                  onChange={(value) =>
                    form.setFieldValue('productScope', value as BundleProductScope)
                  }
                  data={[
                    { label: 'Все', value: 'all' },
                    { label: 'Некоторые', value: 'selected' },
                  ]}
                  w="fit-content"
                />

                {form.values.productScope === 'all' ? (
                  <Text c="dimmed">
                    Комплект сможет применяться ко всем товарам продавца, которые
                    подходят под выбранную механику.
                  </Text>
                ) : (
                  <Stack gap="md">
                    <Group justify="space-between" align="end" gap="sm">
                      <div>
                        <Text fw={600}>Выберите товары</Text>
                        <Text size="sm" c="dimmed" mt={4}>
                          Комплект будет собираться только из выбранных позиций.
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
                      <Stack gap="sm" style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
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
                            Сейчас в каталоге нет товаров, которые можно выбрать для комплекта.
                          </Text>
                        </Stack>
                      </Paper>
                    ) : null}

                    {!productsQuery.isLoading &&
                    !productsQuery.isError &&
                    (productsQuery.data?.length ?? 0) > 0 ? (
                      <Stack gap="sm" style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
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
              </>
            )}
          </Stack>
        </Paper>

        <Paper
          radius="xl"
          p={{ base: 'lg', md: 'xl' }}
          shadow="sm"
          style={{ border: '1px solid rgba(154, 65, 254, 0.1)' }}
        >
          <Group align="start" gap="md" wrap="nowrap">
            <ThemeIcon size={52} radius="xl" variant="light" color="brand">
              <IconGift size={24} />
            </ThemeIcon>
            <Stack gap="xs">
              <Title order={3}>Итоговые настройки</Title>
              <Text fw={700}>{getBenefitSummary()}</Text>
              <Text c="dimmed">
                Товары:{' '}
                {form.values.benefitType === 'pair_discount'
                  ? [pairProductX?.title, pairProductY?.title].filter(Boolean).join(' + ') ||
                    'пара не выбрана'
                  : form.values.productScope === 'all'
                    ? 'весь ассортимент'
                    : `${selectedProducts.length} выбрано`}
              </Text>
            </Stack>
          </Group>
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
          >
            + Создать комплект
          </Button>
        </Box>
      </Stack>
    </form>
  )
}
