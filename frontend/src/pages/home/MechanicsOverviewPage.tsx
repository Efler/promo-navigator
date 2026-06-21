import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core'
import {
  IconArrowRight,
  IconChartBar,
  IconGift,
  IconMessageStar,
  IconSparkles,
  IconTicket,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { mechanics } from './mechanics'

type MechanicKey = 'promotions' | 'promocodes' | 'bundles'

type Recommendation = {
  mechanicKey: MechanicKey
  explanation: string
}

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

const recommendationExplanations: Record<MechanicKey, string> = {
  promotions:
    'Акция лучше всего подходит для заметного роста продаж и работы с широким ассортиментом. Она поможет привлечь больше внимания к товарам за счёт участия в общей кампании маркетплейса.',
  promocodes:
    'Промокод подойдёт для адресного предложения: его удобно использовать для возврата покупателей, ограниченной аудитории или отдельной рекламной коммуникации.',
  bundles:
    'Комплекты помогут связать несколько товаров в одно предложение, увеличить средний чек и стимулировать покупку дополнительных позиций.',
}

function getDemoRecommendation(request: string): Recommendation {
  const normalizedRequest = request.toLocaleLowerCase('ru-RU')

  if (
    ['комплект', 'набор', 'средн', 'дополнительн', 'вместе', 'чек'].some((keyword) =>
      normalizedRequest.includes(keyword),
    )
  ) {
    return {
      mechanicKey: 'bundles',
      explanation: recommendationExplanations.bundles,
    }
  }

  if (
    ['промокод', 'вернуть', 'повторн', 'постоянн', 'аудитори', 'лояльн'].some(
      (keyword) => normalizedRequest.includes(keyword),
    )
  ) {
    return {
      mechanicKey: 'promocodes',
      explanation: recommendationExplanations.promocodes,
    }
  }

  return {
    mechanicKey: 'promotions',
    explanation: recommendationExplanations.promotions,
  }
}

export function MechanicsOverviewPage() {
  const [request, setRequest] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isRecommendationVisible, setIsRecommendationVisible] = useState(false)
  const replacementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recommendedMechanic = recommendation
    ? mechanics.find((mechanic) => mechanic.key === recommendation.mechanicKey)
    : null

  useEffect(
    () => () => {
      if (replacementTimeoutRef.current) {
        clearTimeout(replacementTimeoutRef.current)
      }
    },
    [],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const preparedRequest = request.trim()

    if (!preparedRequest) {
      return
    }

    const nextRecommendation = getDemoRecommendation(preparedRequest)

    if (replacementTimeoutRef.current) {
      clearTimeout(replacementTimeoutRef.current)
    }

    if (isRecommendationVisible) {
      setIsRecommendationVisible(false)
      replacementTimeoutRef.current = setTimeout(() => {
        setRecommendation(nextRecommendation)
        setIsRecommendationVisible(true)
      }, 260)
      return
    }

    setRecommendation(nextRecommendation)
    setIsRecommendationVisible(true)
  }

  function handleExampleClick(example: string) {
    setRequest(example)
    setIsRecommendationVisible(false)
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
                  setIsRecommendationVisible(false)
                }}
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
                    disabled={!request.trim()}
                    rightSection={<IconSparkles size={17} />}
                  >
                    Подобрать механику
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Paper>

          <Transition
            mounted={
              isRecommendationVisible && Boolean(recommendation && recommendedMechanic)
            }
            transition="slide-down"
            duration={260}
            timingFunction="ease"
          >
            {(transitionStyle) =>
              recommendation && recommendedMechanic ? (
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
                            const RecommendedIcon = iconMap[recommendation.mechanicKey]
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
                        Демо-режим
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
                        После подключения сервиса рекомендация также будет учитывать
                        ассортимент и показатели вашего кабинета.
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
