import type { StoveConfig } from '@/contract/v1'

/**
 * Rótulos das variáveis em inglês, como o laboratório as conhece (os valores já
 * vêm em inglês do dataset). Quem não estiver aqui cai no rótulo do metadata.
 */
export const VARIABLE_LABEL_EN: Record<keyof StoveConfig, string> = {
  blower_direction: 'Blower direction',
  housing: 'Electronics housing',
  board_position: 'Board position',
  run_case: 'Operating mode',
  losses: 'Losses',
  deflector_hole: 'Deflector hole',
  material_coil_support: 'Coil support material',
}

/**
 * Opções que existem no metadata, mas são a mesma coisa de outra opção no
 * processamento dos dados (os modelos as unificam antes de treinar), então não
 * devem ser oferecidas como escolha:
 *  - "Open - Updated" é tratado como "Open";
 *  - "Aluminium Plate" é tratado como "Aluminium".
 *
 * `losses` é diferente: nenhum valor é unificado nos dados de treino (todos os 13
 * aparecem). A lista oferecida é a que o IPC Comp — a área em que `losses` mais
 * pesa (~40% de importância) — treinou. As outras 5 estão nos dados, mas o IPC Comp
 * não as conhece (`unmapped_options` no manifesto dos modelos).
 * A API ainda aceita esses valores; só a interface deixa de listá-los.
 */
export const HIDDEN_OPTIONS: Partial<Record<keyof StoveConfig, string[]>> = {
  housing: ['Open - Updated'],
  material_coil_support: ['Aluminium Plate'],
  losses: [
    'Simone Losses',
    'Simone',
    'Miro',
    'C1 Simone - 240/145/180/180',
    'Broil C2 Simone - 240/145/180/180',
  ],
}
