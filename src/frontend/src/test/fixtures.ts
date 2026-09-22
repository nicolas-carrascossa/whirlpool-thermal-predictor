/** Fixtures mínimas do contrato v1 para os testes de interface. */

import type { Metadata, PredictionResponse, SensorPrediction } from '@/contract/v1'

export const FIXTURE_METADATA: Metadata = {
  contract_version: '1.0.0',
  architectures: [
    { code: 'BR', available: true, label_pt: 'Brasil' },
    { code: 'MX', available: false, label_pt: 'Sem dados de treino para a arquitetura México' },
  ],
  variables: [
    { name: 'blower_direction', label_pt: 'Direção do blower', help_pt: 'Ajuda blower.', options: ['To front', 'To back'], used_by_model: true },
    { name: 'housing', label_pt: 'Carcaça da eletrônica', help_pt: 'Ajuda carcaça.', options: ['Closed', 'Open'], used_by_model: true },
    { name: 'board_position', label_pt: 'Posição da placa', help_pt: 'Ajuda placa.', options: ['Center', 'Right'], used_by_model: false },
    { name: 'run_case', label_pt: 'Modo de operação', help_pt: 'Ajuda modo.', options: ['Pyro', 'Broil C2'], used_by_model: true },
    { name: 'losses', label_pt: 'Perfil de perdas', help_pt: 'Ajuda perdas.', options: ['No losses', 'Losses A'], used_by_model: false },
    { name: 'deflector_hole', label_pt: 'Furo do defletor', help_pt: 'Ajuda defletor.', options: ['Closed', 'Open'], used_by_model: true },
    { name: 'material_coil_support', label_pt: 'Material do suporte', help_pt: 'Ajuda material.', options: ['Aluminium', 'Plastic'], used_by_model: true },
  ],
  sensors: [
    { tc_number: 1, tc_name: 'IGBT 1', key_area: 'IPC Comp', active_limit_c: 90, is_monitor: false, monitor_reference_c: null },
    { tc_number: 2, tc_name: 'CMC 1', key_area: 'IPC Comp', active_limit_c: 90, is_monitor: false, monitor_reference_c: null },
    { tc_number: 3, tc_name: 'Knob 1', key_area: 'CT Knobs', active_limit_c: 60, is_monitor: false, monitor_reference_c: null },
    { tc_number: 4, tc_name: 'Vent Out', key_area: 'Main Vent Sys', active_limit_c: null, is_monitor: true, monitor_reference_c: 150 },
  ],
  key_areas: [
    { name: 'IPC Comp', label_pt: 'Compartimento da eletrônica de potência', n_sensors: 2 },
    { name: 'CT Knobs', label_pt: 'Botões do cooktop', n_sensors: 1 },
    { name: 'Main Vent Sys', label_pt: 'Ventilação principal', n_sensors: 1 },
  ],
  reference_config: {
    blower_direction: 'To front',
    housing: 'Closed',
    board_position: 'Center',
    run_case: 'Pyro',
    losses: 'No losses',
    deflector_hole: 'Closed',
    material_coil_support: 'Aluminium',
  },
}

function sensor(partial: Partial<SensorPrediction> & Pick<SensorPrediction, 'tc_number' | 'tc_name' | 'key_area' | 'temp_c'>): SensorPrediction {
  const limit = partial.active_limit_c ?? null
  return {
    error_margin_c: 3.2,
    error_margin_pct: 4.1,
    active_limit_c: limit,
    exceeds_limit: limit !== null && partial.temp_c > limit,
    limit_ratio: limit !== null ? Math.round((partial.temp_c / limit) * 100) / 100 : null,
    is_monitor: limit === null,
    monitor_reference_c: null,
    reliability: 'interpolation',
    ...partial,
  }
}

/**
 * Uma área com um sensor forçado acima do limite (IGBT 1) e outra bem folgada,
 * para exercitar tanto a ordenação quanto o badge de perigo.
 */
export const FIXTURE_RESPONSE: PredictionResponse = {
  request_id: 'req-0000test',
  model_version: 'mock-0.1.0',
  architecture: 'BR',
  architecture_available: true,
  ignored_fields: ['losses', 'board_position'],
  generated_at: '2026-09-10T12:00:00.000Z',
  predictions: [
    sensor({ tc_number: 3, tc_name: 'Knob 1', key_area: 'CT Knobs', temp_c: 42, active_limit_c: 60 }),
    sensor({ tc_number: 2, tc_name: 'CMC 1', key_area: 'IPC Comp', temp_c: 83.4, active_limit_c: 90 }),
    sensor({ tc_number: 1, tc_name: 'IGBT 1', key_area: 'IPC Comp', temp_c: 104.5, active_limit_c: 90 }),
    sensor({ tc_number: 4, tc_name: 'Vent Out', key_area: 'Main Vent Sys', temp_c: 120.9 }),
  ],
}

export const FIXTURE_RESPONSE_MX: PredictionResponse = {
  ...FIXTURE_RESPONSE,
  architecture: 'MX',
  architecture_available: false,
  predictions: [],
}
