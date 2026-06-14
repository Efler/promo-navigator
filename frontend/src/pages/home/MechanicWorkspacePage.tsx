import { Badge, Group, Image, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconClockPause, IconSettings } from '@tabler/icons-react'
import bugsBunnyNo from '../../assets/bugs-bunny-no-meme.png'

type MechanicWorkspacePageProps = {
  title: string
  description: string
}

export function MechanicWorkspacePage({
  title,
  description,
}: MechanicWorkspacePageProps) {
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
          <div>
            <Badge variant="light" color="brand" mb="md">
              Механика
            </Badge>
            <Title order={2} c="dark.8">
              {title}
            </Title>
            <Text c="dimmed" mt="sm" size="lg" maw={720}>
              {description}
            </Text>
          </div>

          <ThemeIcon size={56} radius="xl" color="brand">
            <IconSettings size={28} />
          </ThemeIcon>
        </Group>
      </Paper>

      <Paper
        maw={760}
        mx="auto"
        w="100%"
        p={{ base: 'lg', md: 'xl' }}
        radius="xl"
        shadow="sm"
        style={{
          border: '1px dashed rgba(154, 65, 254, 0.34)',
          background:
            'linear-gradient(180deg, rgba(247,247,250,1) 0%, rgba(255,255,255,1) 100%)',
        }}
      >
        <Stack align="center" gap="lg" py={{ base: 'md', md: 'lg' }}>
          <Badge
            size="lg"
            radius="sm"
            color="brand"
            variant="filled"
            leftSection={<IconClockPause size={16} />}
          >
            В разработке
          </Badge>
          <Image
            src={bugsBunnyNo}
            alt="Раздел пока в разработке"
            h={{ base: 220, md: 320 }}
            fit="contain"
          />
          <div>
            <Title order={3} ta="center">
              Пока не имплементировано
            </Title>
            <Text c="dimmed" ta="center" mt="sm" maw={520}>
              Мы уже готовим этот раздел. Скоро здесь появятся настройки и инструменты
              для работы с механикой.
            </Text>
          </div>
        </Stack>
      </Paper>
    </Stack>
  )
}
