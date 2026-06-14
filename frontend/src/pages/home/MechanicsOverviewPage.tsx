import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconArrowRight, IconChartBar, IconGift, IconTicket } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { mechanics } from './mechanics'

const iconMap = {
  promotions: IconChartBar,
  promocodes: IconTicket,
  bundles: IconGift,
}

export function MechanicsOverviewPage() {
  return (
    <Stack gap="xl">
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
            Кабинет продавца
          </Badge>
          <Title order={1} maw={720}>
            Управляйте механиками продвижения в одном кабинете.
          </Title>
          <Text size="lg" c="dimmed" maw={720}>
            Выбирайте нужный инструмент, работайте с ассортиментом и настраивайте
            предложения для покупателей в удобном формате.
          </Text>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {mechanics
          .filter((mechanic) => mechanic.key !== 'overview')
          .map((mechanic) => {
            const Icon = iconMap[mechanic.key as keyof typeof iconMap]

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
  )
}
