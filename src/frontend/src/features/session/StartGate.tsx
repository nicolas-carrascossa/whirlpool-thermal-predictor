/**
 * Tela de início da consulta: antes de ver qualquer resultado, a pessoa decide
 * se esta previsão será registrada.
 *
 *  - Sim → dá um nome; cada previsão atualiza a mesma consulta no Histórico.
 *  - Não → só visualização momentânea, nada é salvo.
 */

import { useId, useState } from 'react'
import { BookmarkCheck, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const NAME_MAX_LENGTH = 60

type Choice = 'save' | 'view'

function ChoiceCard({
  checked,
  onSelect,
  icon: Icon,
  title,
  text,
}: {
  checked: boolean
  onSelect: () => void
  icon: typeof Eye
  title: string
  text: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex flex-1 flex-col items-start gap-2 rounded-md border-2 bg-white p-4 text-left transition-colors duration-200 hover:bg-wp-gray05 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'border-wp-core bg-wp-accentLt hover:bg-wp-accentLt' : 'border-wp-gray12',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md',
          checked ? 'bg-wp-core text-white' : 'bg-wp-gray05 text-wp-gray85',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="font-display text-base font-extrabold text-wp-gray85">{title}</span>
      <span className="text-sm leading-snug text-wp-gray65">{text}</span>
    </button>
  )
}

export function StartGate({ onStart }: { /** `name` registra a consulta; `null` é só visualização. */ onStart: (name: string | null) => void }) {
  const [choice, setChoice] = useState<Choice | null>(null)
  const [name, setName] = useState('')
  const nameId = useId()
  const trimmed = name.trim()
  const canStart = choice === 'view' || (choice === 'save' && trimmed.length > 0)

  function start() {
    if (!canStart) return
    onStart(choice === 'save' ? trimmed : null)
  }

  return (
    <Card className="w-full max-w-2xl">
      <form
        className="flex flex-col gap-6 p-6"
        onSubmit={(event) => {
          event.preventDefault()
          start()
        }}
      >
        <div>
          <h2 className="font-display text-2xl font-extrabold text-wp-gray85">Nova previsão</h2>
          <p className="mt-1 text-sm text-wp-gray65">Antes de começar, responda:</p>
        </div>

        <div className="flex flex-col gap-3">
          <p id="register-question" className="text-sm font-bold text-wp-gray85">
            Deseja registrar esta previsão?
          </p>
          <div role="radiogroup" aria-labelledby="register-question" className="flex flex-col gap-3 sm:flex-row">
            <ChoiceCard
              checked={choice === 'save'}
              onSelect={() => setChoice('save')}
              icon={BookmarkCheck}
              title="Sim, registrar"
              text="Fica salva no Histórico com o nome que você der. Cada previsão atualiza a mesma consulta."
            />
            <ChoiceCard
              checked={choice === 'view'}
              onSelect={() => setChoice('view')}
              icon={Eye}
              title="Não, só visualizar"
              text="Entra sem salvar nada. Serve para olhar a previsão naquele momento."
            />
          </div>
        </div>

        {choice === 'save' && (
          <div className="flex flex-col gap-2">
            <label htmlFor={nameId} className="text-sm font-bold text-wp-gray85">
              Qual o nome da consulta?
            </label>
            <Input
              id={nameId}
              value={name}
              autoFocus
              maxLength={NAME_MAX_LENGTH}
              placeholder="Ex.: Teste de ventilação do Mainback"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        <Button type="submit" size="lg" disabled={!canStart} className="self-end">
          Começar
        </Button>
      </form>
    </Card>
  )
}
