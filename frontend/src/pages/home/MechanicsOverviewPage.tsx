import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowRight,
  IconChartBar,
  IconClock,
  IconGift,
  IconMessageStar,
  IconSparkles,
  IconTicket,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useRecommendation } from '../../features/recommendations/use-recommendation'
import { ApiError } from '../../shared/api/client'
import { mechanics } from './mechanics'
import classes from './MechanicsOverviewPage.module.css'

type MechanicKey = 'promotions' | 'promocodes' | 'bundles'

const iconMap = {
  promotions: IconChartBar,
  promocodes: IconTicket,
  bundles: IconGift,
}

const examplePrompts = [
  'Хочу увеличить средний чек',
  'Нужно быстро распродать остатки',
  'Хочу вернуть покупателей',
]

function getRecommendationErrorMessage(error: Error | null) {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return 'Сервис подбора сейчас занят или временно недоступен.'
    }

    if (error.status === 504) {
      return 'Подбор не успел завершиться. Попробуйте отправить запрос ещё раз.'
    }
  }

  return 'Не удалось получить рекомендацию. Можно повторить запрос или воспользоваться быстрым подбором.'
}

function getLoadingStatus(elapsedSeconds: number) {
  if (elapsedSeconds >= 60) {
    return 'Формируем понятное обоснование выбора'
  }

  if (elapsedSeconds >= 48) {
    return 'Выбираем механику с наиболее подходящим сценарием'
  }

  if (elapsedSeconds >= 36) {
    return 'Уточняем рекомендацию с учётом текущих возможностей'
  }

  if (elapsedSeconds >= 24) {
    return 'Сравниваем доступные способы продвижения'
  }

  if (elapsedSeconds >= 12) {
    return 'Изучаем ассортимент и состояние товаров'
  }

  return 'Определяем ключевую цель продвижения'
}

export function MechanicsOverviewPage() {
  const [requestError, setRequestError] = useState<string | null>(null)
  const [loadingElapsedSeconds, setLoadingElapsedSeconds] = useState(0)
  const {
    request,
    recommendation,
    isPending,
    error,
    startedAt,
    setRequest,
    runRecommendation,
    clearResult,
    useDemoFallback,
  } = useRecommendation()

  const recommendedMechanic = recommendation?.mechanicKey
    ? mechanics.find((mechanic) => mechanic.key === recommendation.mechanicKey)
    : null

  useEffect(() => {
    if (!isPending || startedAt === null) {
      return
    }

    const updateElapsed = () => {
      setLoadingElapsedSeconds(
        Math.floor((Date.now() - startedAt) / 1000),
      )
    }

    updateElapsed()
    const interval = window.setInterval(() => {
      updateElapsed()
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isPending, startedAt])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const preparedRequest = request.trim()

    if (preparedRequest.length < 10) {
      setRequestError('Опишите задачу чуть подробнее — минимум 10 символов.')
      return
    }

    setRequestError(null)
    setLoadingElapsedSeconds(0)
    runRecommendation(preparedRequest)
  }

  function handleExampleClick(example: string) {
    setRequest(example)
    setRequestError(null)
    clearResult()
  }

  return (
    <Stack gap={36}>
      <Paper
        component="section"
        radius="xl"
        shadow="md"
        p={{ base: 'lg', sm: 32, md: 44 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(154, 65, 254, 0.13)',
          background:
            'radial-gradient(circle at 8% 12%, rgba(154, 65, 254, 0.14), transparent 28%), linear-gradient(145deg, rgba(255,255,255,0.99), rgba(246,241,253,0.98))',
        }}
      >
        <Box
          pos="absolute"
          top={-76}
          right={-48}
          w={190}
          h={150}
          style={{
            borderRadius: '48%',
            background: 'rgba(154, 65, 254, 0.13)',
            filter: 'blur(46px)',
            transform: 'rotate(-18deg)',
          }}
        />

        <Stack gap="xl" maw={880} mx="auto" pos="relative">
          <Stack gap="sm" align="center" ta="center">
            <ThemeIcon size={58} radius="xl" color="brand" variant="light">
              <IconMessageStar size={28} />
            </ThemeIcon>
            <Badge
              variant="light"
              color="brand"
              leftSection={<IconSparkles size={13} />}
            >
              Умный подбор механики
            </Badge>
            <Title order={1} maw={720}>
              Расскажите, какую задачу хотите решить
            </Title>
            <Text size="lg" c="dimmed" maw={700}>
              Опишите цель своими словами, чтобы подобрать подходящую механику
              продвижения и получить краткую сводку рекомендации
            </Text>
          </Stack>

          <Paper
            component="form"
            onSubmit={handleSubmit}
            radius="xl"
            p={{ base: 'md', sm: 'lg' }}
            shadow="sm"
            style={{
              border: '1px solid rgba(154, 65, 254, 0.14)',
              background: 'rgba(255, 255, 255, 0.96)',
            }}
          >
            <Stack gap="md">
              <Textarea
                label="Ваша задача"
                placeholder="Хочу увеличить средний чек и продавать больше сопутствующих товаров..."
                value={request}
                onChange={(event) => {
                  setRequest(event.currentTarget.value)
                  setRequestError(null)
                  clearResult()
                }}
                disabled={isPending}
                error={requestError}
                autosize
                minRows={4}
                maxRows={8}
                maxLength={1000}
                radius="lg"
                size="md"
                styles={{
                  label: {
                    marginBottom: 10,
                    paddingLeft: 18,
                  },
                  input: {
                    padding: '16px 18px',
                    background: '#fbfafd',
                    borderColor: '#dfd6ea',
                    fontSize: 16,
                    lineHeight: 1.55,
                  },
                }}
              />

              <Stack gap="lg">
                <Stack gap={8}>
                  <Text size="xs" c="dimmed" fw={700} ta="center">
                    Можно начать с примера
                  </Text>
                  <Group gap="sm" justify="center" wrap="nowrap" w="100%">
                    {examplePrompts.map((example) => (
                      <Button
                        key={example}
                        type="button"
                        variant="default"
                        radius="md"
                        size="sm"
                        fw={600}
                        styles={{
                          root: {
                            flex: '1 1 0',
                            minWidth: 0,
                            borderColor: '#dedee5',
                            background: '#f7f7f9',
                            color: '#3f3f49',
                          },
                          label: {
                            whiteSpace: 'nowrap',
                          },
                        }}
                        disabled={isPending}
                        onClick={() => handleExampleClick(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </Group>
                </Stack>

                <Group justify="center">
                  <Button
                    type="submit"
                    radius="xl"
                    size="lg"
                    disabled={!request.trim() || isPending}
                    loading={isPending}
                    loaderProps={{ type: 'dots' }}
                    rightSection={<IconSparkles size={17} />}
                  >
                    {isPending ? 'Подбираем механику' : 'Подобрать механику'}
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Paper>

          <Transition
            mounted={isPending}
            transition="slide-down"
            duration={260}
            timingFunction="ease"
          >
            {(transitionStyle) => (
              <Paper
                role="status"
                aria-live="polite"
                radius="xl"
                p={{ base: 'lg', sm: 'xl' }}
                className={classes.loadingCard}
                style={{
                  ...transitionStyle,
                  border: '1px solid rgba(154, 65, 254, 0.18)',
                  background:
                    'linear-gradient(135deg, rgba(154, 65, 254, 0.11), rgba(255, 255, 255, 0.98) 72%)',
                }}
              >
                <Stack gap="lg" pos="relative" style={{ zIndex: 1 }}>
                  <Group gap="md" wrap="nowrap">
                    <ThemeIcon
                      size={52}
                      radius="xl"
                      color="brand"
                      variant="light"
                      className={classes.loadingIcon}
                    >
                      <Loader color="brand" size={25} type="dots" />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={750} c="brand.7">
                        Подбираем механику
                      </Text>
                      <Title order={3} mt={3}>
                        {getLoadingStatus(loadingElapsedSeconds)}
                      </Title>
                    </div>
                  </Group>

                  <Progress
                    value={100}
                    size="sm"
                    radius="xl"
                    animated
                    color="brand"
                    aria-label="Подбор рекомендации выполняется"
                  />

                  <Group justify="space-between" gap="sm">
                    <Group gap={7}>
                      <IconClock
                        size={16}
                        color="var(--mantine-color-dimmed)"
                      />
                      <Text size="sm" c="dimmed">
                        Прошло {loadingElapsedSeconds} сек.
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed" ta="right">
                      Подбор может занять некоторое время
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            )}
          </Transition>

          <Transition
            mounted={Boolean(error)}
            transition="slide-down"
            duration={260}
            timingFunction="ease"
          >
            {(transitionStyle) => (
              <Alert
                style={transitionStyle}
                variant="light"
                color="red"
                radius="xl"
                icon={<IconAlertCircle size={20} />}
                title="Подбор не завершён"
              >
                <Stack gap="md">
                  <Text size="sm">
                    {getRecommendationErrorMessage(error)}
                  </Text>
                  <Group gap="sm">
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      onClick={() => runRecommendation(request.trim())}
                    >
                      Повторить запрос
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={useDemoFallback}
                    >
                      Использовать быстрый подбор
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}
          </Transition>

          <Transition
            mounted={Boolean(recommendation)}
            transition="slide-down"
            duration={260}
            timingFunction="ease"
          >
            {(transitionStyle) =>
              recommendation?.resultType === 'clarification_required' ? (
                <Paper
                  role="status"
                  aria-live="polite"
                  radius="xl"
                  p={{ base: 'lg', sm: 'xl' }}
                  style={{
                    ...transitionStyle,
                    border: '1px solid rgba(235, 151, 45, 0.25)',
                    background:
                      'linear-gradient(135deg, rgba(255, 243, 220, 0.8), rgba(255, 255, 255, 0.98) 72%)',
                  }}
                >
                  <Group gap="md" wrap="nowrap" align="start">
                    <ThemeIcon
                      size={48}
                      radius="xl"
                      color="orange"
                      variant="light"
                    >
                      <IconMessageStar size={23} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" tt="uppercase" fw={750} c="orange.8">
                        Нужно немного больше деталей
                      </Text>
                      <Title order={3} mt={3}>
                        Уточните задачу продвижения
                      </Title>
                      <Text c="dimmed" mt={8} lh={1.6}>
                        {recommendation.explanation}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              ) : recommendation && recommendedMechanic ? (
                <Paper
                  role="status"
                  aria-live="polite"
                  radius="xl"
                  p={{ base: 'lg', sm: 'xl' }}
                  style={{
                    ...transitionStyle,
                    border: '1px solid rgba(154, 65, 254, 0.2)',
                    background:
                      'linear-gradient(135deg, rgba(154, 65, 254, 0.1), rgba(255, 255, 255, 0.98) 68%)',
                  }}
                >
                  <Stack gap="lg">
                    <Group justify="space-between" align="start" gap="md">
                      <Group gap="md" wrap="nowrap" align="start">
                        <ThemeIcon size={48} radius="xl" color="brand" variant="filled">
                          {(() => {
                            const RecommendedIcon =
                              iconMap[recommendedMechanic.key as MechanicKey]
                            return <RecommendedIcon size={23} />
                          })()}
                        </ThemeIcon>
                        <div>
                          <Text size="xs" tt="uppercase" fw={750} c="brand.7">
                            Рекомендуемая механика
                          </Text>
                          <Title order={2} mt={3}>
                            {recommendedMechanic.label}
                          </Title>
                        </div>
                      </Group>
                      <Badge variant="outline" color="brand">
                        {recommendation.source === 'llm'
                          ? 'По данным кабинета'
                          : 'Быстрый подбор'}
                      </Badge>
                    </Group>

                    <div>
                      <Text fw={700}>Почему это подходит</Text>
                      <Text c="dimmed" mt={6} lh={1.6}>
                        {recommendation.explanation}
                      </Text>
                    </div>

                    <Group justify="space-between" align="center" gap="md">
                      <Text size="sm" c="dimmed" maw={560}>
                        {recommendation.source === 'llm'
                          ? 'Рекомендация учитывает текущий ассортимент, остатки и доступные инструменты продвижения.'
                          : 'Использован локальный подбор по ключевым словам без обращения к модели.'}
                      </Text>
                      <Button
                        component={Link}
                        to={recommendedMechanic.to}
                        variant="light"
                        color="brand"
                        radius="xl"
                        rightSection={<IconArrowRight size={16} />}
                      >
                        Перейти к механике
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ) : (
                <Box style={transitionStyle} />
              )
            }
          </Transition>
        </Stack>
      </Paper>

      <Stack gap="lg">
        <div>
          <Title order={2}>Все механики продвижения</Title>
          <Text c="dimmed" mt={6}>
            Можно выбрать инструмент самостоятельно и перейти к настройке.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {mechanics
            .filter((mechanic) => mechanic.key !== 'overview')
            .map((mechanic) => {
              const Icon = iconMap[mechanic.key as MechanicKey]

              return (
                <Card
                  key={mechanic.key}
                  radius="xl"
                  padding="xl"
                  shadow="sm"
                  style={{
                    border: '1px solid rgba(154, 65, 254, 0.1)',
                    background: 'rgba(255, 255, 255, 0.96)',
                  }}
                >
                  <Stack justify="space-between" h="100%" gap="lg">
                    <div>
                      <ThemeIcon size={52} radius="xl" color="brand" variant="light">
                        <Icon size={24} />
                      </ThemeIcon>
                      <Group justify="space-between" mt="lg" align="start">
                        <Title order={3}>{mechanic.label}</Title>
                        {mechanic.isBeta ? (
                          <Badge
                            variant="light"
                            styles={{
                              root: {
                                backgroundColor: 'rgba(142, 191, 237, 0.22)',
                                color: '#4d7294',
                              },
                            }}
                          >
                            Beta
                          </Badge>
                        ) : null}
                      </Group>
                      <Text c="dimmed" mt="sm">
                        {mechanic.description}
                      </Text>
                    </div>

                    <Button
                      component={Link}
                      to={mechanic.to}
                      variant="light"
                      color="brand"
                      rightSection={<IconArrowRight size={16} />}
                    >
                      Открыть механику
                    </Button>
                  </Stack>
                </Card>
              )
            })}
        </SimpleGrid>
      </Stack>
    </Stack>
  )
}
