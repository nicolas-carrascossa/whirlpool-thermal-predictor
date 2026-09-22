/**
 * Dados SIMULADOS para a aba "Métricas Estatísticas".
 *
 * Nada aqui trafega pela API nem faz parte do contrato v1: `PredictionResponse`
 * não carrega métricas de validação, importância de variáveis nem pares
 * previsto/real. Os valores abaixo são literais fixos e versionados — sem
 * geração aleatória em runtime — para a tela ser determinística e testável.
 *
 * Como foram construídos (uma única vez, fora do app):
 * - `actual` cai na faixa térmica real de cada área (média/desvio do dataset:
 *   Mainback 80,7/47,6 · Coil Temps 126,9/45,0 · Main Vent Sys 80,5/21,4 ·
 *   IPC Cooling 57,4/18,6 · IPC Comp 83,4/17,0 · CT Knobs 49,3/7,7 ·
 *   Oven HMI 58,1/3,9 °C), com nomes e limites vindos do registro de sensores.
 * - `errorMetrics` foram calculadas a partir dos próprios pares, então tabela,
 *   dispersão e mapa de calor contam a mesma história.
 * - Áreas de baixa dispersão (Oven HMI, CT Knobs) têm MAE menor e R² instável;
 *   áreas de alta dispersão (Mainback, Coil Temps) têm MAE maior e R² melhor.
 * - `losses` e `board_position` têm importância exatamente 0 em todas as áreas
 *   (H2: `used_by_model: false`); as outras cinco somam 1,0.
 */

import type { StoveConfig } from '@/contract/v1'

/** Texto de ressalva exibido no topo da aba. Não é opcional. */
export const METRICS_DISCLAIMER =
  'Valores simulados para demonstração da interface. Não representam o resultado real de treino ou validação do modelo.'

/** KPI do projeto: erro percentual máximo aceito (MAPE, em %). */
export const KPI_MAPE_LIMIT_PCT = 10
/** Faixa de atenção: a partir daqui a área está perto de estourar o KPI. */
export const KPI_MAPE_WARN_PCT = 8

export interface ErrorMetrics {
  /** Erro absoluto médio, em °C. */
  mae: number
  /** Raiz do erro quadrático médio, em °C. */
  rmse: number
  /** Coeficiente de determinação no conjunto de teste. */
  r2: number
  /** Erro percentual absoluto médio, em %. */
  mapePct: number
  /** Fração (0..1) das predições com erro ≤ 10 % — o KPI do projeto. */
  withinTenPctRate: number
}

export interface PredictedVsActualPoint {
  tcNumber: number
  tcName: string
  /** Ensaio de teste de onde veio a leitura; um sensor aparece em vários. */
  run: string
  /** Limite normativo do sensor, em °C; `null` para sensores de monitoramento. */
  activeLimitC: number | null
  /** Temperatura medida, em °C. */
  actual: number
  /** Temperatura prevista pelo modelo, em °C. */
  predicted: number
}

export type FeatureImportance = Record<keyof StoveConfig, number>

export interface AreaMetrics {
  keyArea: string
  errorMetrics: ErrorMetrics
  featureImportance: FeatureImportance
  predictedVsActual: PredictedVsActualPoint[]
}

/** As 7 variáveis de configuração, na ordem do formulário. */
export const CONFIG_VARIABLES: (keyof StoveConfig)[] = [
  'blower_direction',
  'housing',
  'board_position',
  'run_case',
  'losses',
  'deflector_hole',
  'material_coil_support',
]

/** Variáveis excluídas pela H2 — importância obrigatoriamente 0. */
export const VARIABLES_NOT_USED_BY_MODEL: (keyof StoveConfig)[] = ['losses', 'board_position']

export const MOCK_AREA_METRICS: AreaMetrics[] = [
  {
    keyArea: 'Mainback',
    errorMetrics: { mae: 5.92, rmse: 7.41, r2: 0.975, mapePct: 9.01, withinTenPctRate: 0.576 },
    featureImportance: {
      blower_direction: 0.15,
      housing: 0.17,
      board_position: 0.00,
      run_case: 0.52,
      losses: 0.00,
      deflector_hole: 0.10,
      material_coil_support: 0.06,
    },
    predictedVsActual: [
      { tcNumber: 1, tcName: 'Door Lock Motor Ambient 1/2" Below', run: 'Run 01', activeLimitC: 155, actual: 77.8, predicted: 85.1 },
      { tcNumber: 2, tcName: 'Door Lock Microswitch Body', run: 'Run 01', activeLimitC: 136, actual: 88.8, predicted: 87.6 },
      { tcNumber: 3, tcName: 'Convect Motor Winding', run: 'Run 01', activeLimitC: 165, actual: 43.8, predicted: 42.0 },
      { tcNumber: 4, tcName: 'Hot Surface Indicator Body', run: 'Run 01', activeLimitC: 85, actual: 47.0, predicted: 54.5 },
      { tcNumber: 5, tcName: 'Power On Indicator Body', run: 'Run 01', activeLimitC: 85, actual: 28.0, predicted: 33.4 },
      { tcNumber: 6, tcName: 'Oven RTD Connector Body', run: 'Run 01', activeLimitC: 150, actual: 178.3, predicted: 180.7 },
      { tcNumber: 7, tcName: 'Storage Drawer (Metal Above)', run: 'Run 01', activeLimitC: 150, actual: 71.5, predicted: 69.7 },
      { tcNumber: 8, tcName: 'L2, Wire, Power Cord', run: 'Run 01', activeLimitC: 60, actual: 164.9, predicted: 167.0 },
      { tcNumber: 9, tcName: 'Ambient Below Terminal Block', run: 'Run 01', activeLimitC: 60, actual: 42.7, predicted: 51.2 },
      { tcNumber: 10, tcName: 'ACU Ambient (Hill Only) Top', run: 'Run 01', activeLimitC: 85, actual: 63.3, predicted: 64.2 },
      { tcNumber: 11, tcName: 'ACU K8 Housing / Double Line Break', run: 'Run 01', activeLimitC: 140, actual: 159.4, predicted: 180.6 },
      { tcNumber: 1, tcName: 'Door Lock Motor Ambient 1/2" Below', run: 'Run 02', activeLimitC: 155, actual: 97.5, predicted: 107.4 },
      { tcNumber: 2, tcName: 'Door Lock Microswitch Body', run: 'Run 02', activeLimitC: 136, actual: 57.1, predicted: 56.2 },
      { tcNumber: 3, tcName: 'Convect Motor Winding', run: 'Run 02', activeLimitC: 165, actual: 61.3, predicted: 59.6 },
      { tcNumber: 4, tcName: 'Hot Surface Indicator Body', run: 'Run 02', activeLimitC: 85, actual: 50.9, predicted: 57.1 },
      { tcNumber: 5, tcName: 'Power On Indicator Body', run: 'Run 02', activeLimitC: 85, actual: 27.0, predicted: 33.5 },
      { tcNumber: 6, tcName: 'Oven RTD Connector Body', run: 'Run 02', activeLimitC: 150, actual: 179.6, predicted: 168.6 },
      { tcNumber: 7, tcName: 'Storage Drawer (Metal Above)', run: 'Run 02', activeLimitC: 150, actual: 71.7, predicted: 82.1 },
      { tcNumber: 8, tcName: 'L2, Wire, Power Cord', run: 'Run 02', activeLimitC: 60, actual: 133.7, predicted: 129.5 },
      { tcNumber: 9, tcName: 'Ambient Below Terminal Block', run: 'Run 02', activeLimitC: 60, actual: 80.3, predicted: 96.7 },
      { tcNumber: 10, tcName: 'ACU Ambient (Hill Only) Top', run: 'Run 02', activeLimitC: 85, actual: 74.4, predicted: 69.7 },
      { tcNumber: 11, tcName: 'ACU K8 Housing / Double Line Break', run: 'Run 02', activeLimitC: 140, actual: 167.4, predicted: 163.0 },
      { tcNumber: 1, tcName: 'Door Lock Motor Ambient 1/2" Below', run: 'Run 03', activeLimitC: 155, actual: 94.8, predicted: 95.0 },
      { tcNumber: 2, tcName: 'Door Lock Microswitch Body', run: 'Run 03', activeLimitC: 136, actual: 41.9, predicted: 48.6 },
      { tcNumber: 3, tcName: 'Convect Motor Winding', run: 'Run 03', activeLimitC: 165, actual: 32.7, predicted: 38.2 },
      { tcNumber: 4, tcName: 'Hot Surface Indicator Body', run: 'Run 03', activeLimitC: 85, actual: 27.0, predicted: 30.6 },
      { tcNumber: 5, tcName: 'Power On Indicator Body', run: 'Run 03', activeLimitC: 85, actual: 29.1, predicted: 25.6 },
      { tcNumber: 6, tcName: 'Oven RTD Connector Body', run: 'Run 03', activeLimitC: 150, actual: 101.6, predicted: 92.7 },
      { tcNumber: 7, tcName: 'Storage Drawer (Metal Above)', run: 'Run 03', activeLimitC: 150, actual: 71.9, predicted: 76.7 },
      { tcNumber: 8, tcName: 'L2, Wire, Power Cord', run: 'Run 03', activeLimitC: 60, actual: 140.6, predicted: 145.5 },
      { tcNumber: 9, tcName: 'Ambient Below Terminal Block', run: 'Run 03', activeLimitC: 60, actual: 53.0, predicted: 49.0 },
      { tcNumber: 10, tcName: 'ACU Ambient (Hill Only) Top', run: 'Run 03', activeLimitC: 85, actual: 62.5, predicted: 55.7 },
      { tcNumber: 11, tcName: 'ACU K8 Housing / Double Line Break', run: 'Run 03', activeLimitC: 140, actual: 131.3, predicted: 141.4 },
    ],
  },
  {
    keyArea: 'Coil Temps',
    errorMetrics: { mae: 11.89, rmse: 15.18, r2: 0.898, mapePct: 10.28, withinTenPctRate: 0.594 },
    featureImportance: {
      blower_direction: 0.05,
      housing: 0.08,
      board_position: 0.00,
      run_case: 0.71,
      losses: 0.00,
      deflector_hole: 0.04,
      material_coil_support: 0.12,
    },
    predictedVsActual: [
      { tcNumber: 12, tcName: 'Coil FR', run: 'Run 01', activeLimitC: 220, actual: 52.3, predicted: 54.2 },
      { tcNumber: 13, tcName: 'Coil FL', run: 'Run 01', activeLimitC: 220, actual: 103.5, predicted: 105.1 },
      { tcNumber: 14, tcName: 'Coil  RR', run: 'Run 01', activeLimitC: 220, actual: 91.6, predicted: 89.6 },
      { tcNumber: 15, tcName: 'Coil RL', run: 'Run 01', activeLimitC: 220, actual: 81.5, predicted: 80.8 },
      { tcNumber: 16, tcName: 'Aluminium Plate FL', run: 'Run 01', activeLimitC: 150, actual: 69.6, predicted: 77.3 },
      { tcNumber: 17, tcName: 'Aluminium Plate  RR', run: 'Run 01', activeLimitC: 150, actual: 97.4, predicted: 90.9 },
      { tcNumber: 18, tcName: 'Aluminium Plate RL', run: 'Run 01', activeLimitC: 150, actual: 227.2, predicted: 211.8 },
      { tcNumber: 19, tcName: 'Aluminium Plate FR', run: 'Run 01', activeLimitC: 150, actual: 182.1, predicted: 196.0 },
      { tcNumber: 12, tcName: 'Coil FR', run: 'Run 02', activeLimitC: 220, actual: 79.9, predicted: 81.4 },
      { tcNumber: 13, tcName: 'Coil FL', run: 'Run 02', activeLimitC: 220, actual: 96.4, predicted: 121.2 },
      { tcNumber: 14, tcName: 'Coil  RR', run: 'Run 02', activeLimitC: 220, actual: 108.6, predicted: 108.5 },
      { tcNumber: 15, tcName: 'Coil RL', run: 'Run 02', activeLimitC: 220, actual: 102.5, predicted: 77.3 },
      { tcNumber: 16, tcName: 'Aluminium Plate FL', run: 'Run 02', activeLimitC: 150, actual: 75.8, predicted: 90.4 },
      { tcNumber: 17, tcName: 'Aluminium Plate  RR', run: 'Run 02', activeLimitC: 150, actual: 141.5, predicted: 132.8 },
      { tcNumber: 18, tcName: 'Aluminium Plate RL', run: 'Run 02', activeLimitC: 150, actual: 189.7, predicted: 200.5 },
      { tcNumber: 19, tcName: 'Aluminium Plate FR', run: 'Run 02', activeLimitC: 150, actual: 126.0, predicted: 145.2 },
      { tcNumber: 12, tcName: 'Coil FR', run: 'Run 03', activeLimitC: 220, actual: 116.3, predicted: 105.7 },
      { tcNumber: 13, tcName: 'Coil FL', run: 'Run 03', activeLimitC: 220, actual: 116.1, predicted: 106.2 },
      { tcNumber: 14, tcName: 'Coil  RR', run: 'Run 03', activeLimitC: 220, actual: 131.8, predicted: 117.1 },
      { tcNumber: 15, tcName: 'Coil RL', run: 'Run 03', activeLimitC: 220, actual: 70.1, predicted: 83.1 },
      { tcNumber: 16, tcName: 'Aluminium Plate FL', run: 'Run 03', activeLimitC: 150, actual: 36.9, predicted: 38.8 },
      { tcNumber: 17, tcName: 'Aluminium Plate  RR', run: 'Run 03', activeLimitC: 150, actual: 138.0, predicted: 176.1 },
      { tcNumber: 18, tcName: 'Aluminium Plate RL', run: 'Run 03', activeLimitC: 150, actual: 196.6, predicted: 191.8 },
      { tcNumber: 19, tcName: 'Aluminium Plate FR', run: 'Run 03', activeLimitC: 150, actual: 168.6, predicted: 148.5 },
      { tcNumber: 12, tcName: 'Coil FR', run: 'Run 04', activeLimitC: 220, actual: 83.4, predicted: 78.3 },
      { tcNumber: 13, tcName: 'Coil FL', run: 'Run 04', activeLimitC: 220, actual: 124.2, predicted: 134.4 },
      { tcNumber: 14, tcName: 'Coil  RR', run: 'Run 04', activeLimitC: 220, actual: 108.5, predicted: 83.1 },
      { tcNumber: 15, tcName: 'Coil RL', run: 'Run 04', activeLimitC: 220, actual: 76.8, predicted: 84.0 },
      { tcNumber: 16, tcName: 'Aluminium Plate FL', run: 'Run 04', activeLimitC: 150, actual: 46.3, predicted: 53.2 },
      { tcNumber: 17, tcName: 'Aluminium Plate  RR', run: 'Run 04', activeLimitC: 150, actual: 175.2, predicted: 144.3 },
      { tcNumber: 18, tcName: 'Aluminium Plate RL', run: 'Run 04', activeLimitC: 150, actual: 187.9, predicted: 193.2 },
      { tcNumber: 19, tcName: 'Aluminium Plate FR', run: 'Run 04', activeLimitC: 150, actual: 167.2, predicted: 188.9 },
    ],
  },
  {
    keyArea: 'Main Vent Sys',
    errorMetrics: { mae: 3.88, rmse: 4.78, r2: 0.952, mapePct: 5.77, withinTenPctRate: 0.821 },
    featureImportance: {
      blower_direction: 0.38,
      housing: 0.21,
      board_position: 0.00,
      run_case: 0.12,
      losses: 0.00,
      deflector_hole: 0.26,
      material_coil_support: 0.03,
    },
    predictedVsActual: [
      { tcNumber: 20, tcName: 'AC Blower Inlet Max', run: 'Run 01', activeLimitC: null, actual: 92.6, predicted: 98.9 },
      { tcNumber: 21, tcName: 'AC Blower Inlet Avg', run: 'Run 01', activeLimitC: null, actual: 64.3, predicted: 71.2 },
      { tcNumber: 22, tcName: 'AC Blower HES Connector', run: 'Run 01', activeLimitC: 130, actual: 66.5, predicted: 75.4 },
      { tcNumber: 23, tcName: 'AC Blower Windings', run: 'Run 01', activeLimitC: 175, actual: 95.1, predicted: 93.8 },
      { tcNumber: 24, tcName: 'AC Blower Housing', run: 'Run 01', activeLimitC: 150, actual: 37.7, predicted: 44.6 },
      { tcNumber: 25, tcName: 'Top Duct Inlet', run: 'Run 01', activeLimitC: null, actual: 98.0, predicted: 94.3 },
      { tcNumber: 26, tcName: 'Turbo Duct / AC Blower Outlet', run: 'Run 01', activeLimitC: null, actual: 84.7, predicted: 92.7 },
      { tcNumber: 20, tcName: 'AC Blower Inlet Max', run: 'Run 02', activeLimitC: null, actual: 91.9, predicted: 93.0 },
      { tcNumber: 21, tcName: 'AC Blower Inlet Avg', run: 'Run 02', activeLimitC: null, actual: 57.3, predicted: 52.6 },
      { tcNumber: 22, tcName: 'AC Blower HES Connector', run: 'Run 02', activeLimitC: 130, actual: 62.9, predicted: 61.4 },
      { tcNumber: 23, tcName: 'AC Blower Windings', run: 'Run 02', activeLimitC: 175, actual: 75.4, predicted: 77.3 },
      { tcNumber: 24, tcName: 'AC Blower Housing', run: 'Run 02', activeLimitC: 150, actual: 48.5, predicted: 53.0 },
      { tcNumber: 25, tcName: 'Top Duct Inlet', run: 'Run 02', activeLimitC: null, actual: 80.1, predicted: 76.5 },
      { tcNumber: 26, tcName: 'Turbo Duct / AC Blower Outlet', run: 'Run 02', activeLimitC: null, actual: 51.1, predicted: 54.0 },
      { tcNumber: 20, tcName: 'AC Blower Inlet Max', run: 'Run 03', activeLimitC: null, actual: 81.0, predicted: 79.5 },
      { tcNumber: 21, tcName: 'AC Blower Inlet Avg', run: 'Run 03', activeLimitC: null, actual: 57.2, predicted: 54.4 },
      { tcNumber: 22, tcName: 'AC Blower HES Connector', run: 'Run 03', activeLimitC: 130, actual: 71.1, predicted: 62.9 },
      { tcNumber: 23, tcName: 'AC Blower Windings', run: 'Run 03', activeLimitC: 175, actual: 115.1, predicted: 105.3 },
      { tcNumber: 24, tcName: 'AC Blower Housing', run: 'Run 03', activeLimitC: 150, actual: 37.7, predicted: 32.3 },
      { tcNumber: 25, tcName: 'Top Duct Inlet', run: 'Run 03', activeLimitC: null, actual: 90.7, predicted: 94.1 },
      { tcNumber: 26, tcName: 'Turbo Duct / AC Blower Outlet', run: 'Run 03', activeLimitC: null, actual: 48.5, predicted: 47.0 },
      { tcNumber: 20, tcName: 'AC Blower Inlet Max', run: 'Run 04', activeLimitC: null, actual: 85.1, predicted: 81.2 },
      { tcNumber: 21, tcName: 'AC Blower Inlet Avg', run: 'Run 04', activeLimitC: null, actual: 73.1, predicted: 74.2 },
      { tcNumber: 22, tcName: 'AC Blower HES Connector', run: 'Run 04', activeLimitC: 130, actual: 51.5, predicted: 52.9 },
      { tcNumber: 23, tcName: 'AC Blower Windings', run: 'Run 04', activeLimitC: 175, actual: 117.4, predicted: 111.1 },
      { tcNumber: 24, tcName: 'AC Blower Housing', run: 'Run 04', activeLimitC: 150, actual: 37.7, predicted: 37.8 },
      { tcNumber: 25, tcName: 'Top Duct Inlet', run: 'Run 04', activeLimitC: null, actual: 81.2, predicted: 81.6 },
      { tcNumber: 26, tcName: 'Turbo Duct / AC Blower Outlet', run: 'Run 04', activeLimitC: null, actual: 51.8, predicted: 51.2 },
    ],
  },
  {
    keyArea: 'IPC Cooling',
    errorMetrics: { mae: 3.41, rmse: 4.24, r2: 0.900, mapePct: 6.21, withinTenPctRate: 0.786 },
    featureImportance: {
      blower_direction: 0.29,
      housing: 0.34,
      board_position: 0.00,
      run_case: 0.15,
      losses: 0.00,
      deflector_hole: 0.18,
      material_coil_support: 0.04,
    },
    predictedVsActual: [
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 01', activeLimitC: null, actual: 59.1, predicted: 63.9 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 01', activeLimitC: null, actual: 43.9, predicted: 48.1 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 01', activeLimitC: 120, actual: 71.6, predicted: 71.2 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 01', activeLimitC: null, actual: 39.7, predicted: 42.1 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 02', activeLimitC: null, actual: 75.3, predicted: 72.4 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 02', activeLimitC: null, actual: 54.7, predicted: 57.7 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 02', activeLimitC: 120, actual: 52.7, predicted: 45.9 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 02', activeLimitC: null, actual: 54.5, predicted: 55.9 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 03', activeLimitC: null, actual: 90.1, predicted: 78.4 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 03', activeLimitC: null, actual: 60.4, predicted: 58.0 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 03', activeLimitC: 120, actual: 59.6, predicted: 63.0 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 03', activeLimitC: null, actual: 52.2, predicted: 52.0 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 04', activeLimitC: null, actual: 67.8, predicted: 65.6 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 04', activeLimitC: null, actual: 56.8, predicted: 56.7 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 04', activeLimitC: 120, actual: 61.8, predicted: 58.6 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 04', activeLimitC: null, actual: 41.5, predicted: 40.3 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 05', activeLimitC: null, actual: 75.8, predicted: 72.2 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 05', activeLimitC: null, actual: 49.4, predicted: 48.7 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 05', activeLimitC: 120, actual: 58.7, predicted: 53.4 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 05', activeLimitC: null, actual: 51.4, predicted: 52.9 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 06', activeLimitC: null, actual: 77.2, predicted: 76.0 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 06', activeLimitC: null, actual: 31.6, predicted: 38.0 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 06', activeLimitC: 120, actual: 71.1, predicted: 74.9 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 06', activeLimitC: null, actual: 44.1, predicted: 50.0 },
      { tcNumber: 27, tcName: 'IPC Vertical Duct Inlet (Bottom)', run: 'Run 07', activeLimitC: null, actual: 65.4, predicted: 64.4 },
      { tcNumber: 28, tcName: 'IPC Horizontal Duct Oulet (Inlet IPC Fan)', run: 'Run 07', activeLimitC: null, actual: 48.0, predicted: 53.8 },
      { tcNumber: 29, tcName: 'IPC Housing Surface', run: 'Run 07', activeLimitC: 120, actual: 75.9, predicted: 71.1 },
      { tcNumber: 30, tcName: 'IPC Housing Outlet', run: 'Run 07', activeLimitC: null, actual: 44.3, predicted: 49.5 },
    ],
  },
  {
    keyArea: 'IPC Comp',
    errorMetrics: { mae: 3.51, rmse: 4.19, r2: 0.925, mapePct: 4.82, withinTenPctRate: 0.900 },
    featureImportance: {
      blower_direction: 0.22,
      housing: 0.31,
      board_position: 0.00,
      run_case: 0.27,
      losses: 0.00,
      deflector_hole: 0.14,
      material_coil_support: 0.06,
    },
    predictedVsActual: [
      { tcNumber: 32, tcName: 'IPC Blower (Air Outlet Temp)', run: 'Run 01', activeLimitC: null, actual: 86.4, predicted: 83.2 },
      { tcNumber: 33, tcName: 'IPC Blower Housing', run: 'Run 01', activeLimitC: 85, actual: 72.3, predicted: 79.8 },
      { tcNumber: 34, tcName: 'Heat Sink (Point/Probe)', run: 'Run 01', activeLimitC: null, actual: 85.8, predicted: 85.4 },
      { tcNumber: 35, tcName: 'Bridge', run: 'Run 01', activeLimitC: 110, actual: 103.9, predicted: 104.8 },
      { tcNumber: 36, tcName: 'IGBT 1', run: 'Run 01', activeLimitC: 110, actual: 95.0, predicted: 89.6 },
      { tcNumber: 37, tcName: 'IGBT 2', run: 'Run 01', activeLimitC: 110, actual: 105.3, predicted: 104.3 },
      { tcNumber: 38, tcName: 'IGBT 3', run: 'Run 01', activeLimitC: 110, actual: 54.2, predicted: 50.8 },
      { tcNumber: 39, tcName: 'IGBT 4', run: 'Run 01', activeLimitC: 110, actual: 94.9, predicted: 90.7 },
      { tcNumber: 40, tcName: 'IGBT 5', run: 'Run 01', activeLimitC: 110, actual: 81.9, predicted: 78.3 },
      { tcNumber: 41, tcName: 'IGBT 6', run: 'Run 01', activeLimitC: 110, actual: 98.0, predicted: 91.1 },
      { tcNumber: 42, tcName: 'IGBT 7', run: 'Run 01', activeLimitC: 110, actual: 95.6, predicted: 93.0 },
      { tcNumber: 43, tcName: 'IGBT 8', run: 'Run 01', activeLimitC: 110, actual: 91.5, predicted: 89.9 },
      { tcNumber: 44, tcName: 'IGBT 9', run: 'Run 01', activeLimitC: 110, actual: 54.6, predicted: 63.8 },
      { tcNumber: 45, tcName: 'IGBT 10', run: 'Run 01', activeLimitC: 110, actual: 71.4, predicted: 71.8 },
      { tcNumber: 46, tcName: 'IGBT 11', run: 'Run 01', activeLimitC: 110, actual: 88.7, predicted: 89.2 },
      { tcNumber: 47, tcName: 'IGBT 12', run: 'Run 01', activeLimitC: 110, actual: 66.0, predicted: 72.2 },
      { tcNumber: 48, tcName: 'IGBT 13', run: 'Run 01', activeLimitC: 110, actual: 87.4, predicted: 85.7 },
      { tcNumber: 49, tcName: 'IGBT 14', run: 'Run 01', activeLimitC: 110, actual: 65.8, predicted: 69.7 },
      { tcNumber: 50, tcName: 'IGBT 15', run: 'Run 01', activeLimitC: 110, actual: 68.9, predicted: 67.2 },
      { tcNumber: 51, tcName: 'IGBT 16', run: 'Run 01', activeLimitC: 110, actual: 65.4, predicted: 69.1 },
      { tcNumber: 52, tcName: 'DCBUS Cap 1', run: 'Run 01', activeLimitC: 125, actual: 51.0, predicted: 58.3 },
      { tcNumber: 53, tcName: 'DCBUS Cap 2', run: 'Run 01', activeLimitC: 125, actual: 64.4, predicted: 61.6 },
      { tcNumber: 54, tcName: 'DCBUS Cap 3', run: 'Run 01', activeLimitC: 125, actual: 73.0, predicted: 77.3 },
      { tcNumber: 55, tcName: 'DCBUS Cap 4', run: 'Run 01', activeLimitC: 125, actual: 104.2, predicted: 99.3 },
      { tcNumber: 56, tcName: 'CMC 1', run: 'Run 01', activeLimitC: 90, actual: 80.9, predicted: 78.3 },
      { tcNumber: 57, tcName: 'CMC 2', run: 'Run 01', activeLimitC: 90, actual: 77.5, predicted: 82.4 },
      { tcNumber: 58, tcName: 'DMC', run: 'Run 01', activeLimitC: 90, actual: 70.5, predicted: 68.4 },
      { tcNumber: 59, tcName: 'Reso Cap 1', run: 'Run 01', activeLimitC: 100, actual: 91.2, predicted: 88.0 },
      { tcNumber: 60, tcName: 'Reso Cap 2', run: 'Run 01', activeLimitC: 100, actual: 93.6, predicted: 93.1 },
      { tcNumber: 61, tcName: 'Reso Cap 3', run: 'Run 01', activeLimitC: 100, actual: 69.1, predicted: 73.8 },
    ],
  },
  {
    keyArea: 'CT Knobs',
    errorMetrics: { mae: 2.22, rmse: 2.66, r2: 0.366, mapePct: 4.82, withinTenPctRate: 0.933 },
    featureImportance: {
      blower_direction: 0.17,
      housing: 0.23,
      board_position: 0.00,
      run_case: 0.44,
      losses: 0.00,
      deflector_hole: 0.11,
      material_coil_support: 0.05,
    },
    predictedVsActual: [
      { tcNumber: 73, tcName: 'Ambient Between Left Encoders', run: 'Run 01', activeLimitC: 105, actual: 52.0, predicted: 48.8 },
      { tcNumber: 74, tcName: 'Left Encoder', run: 'Run 01', activeLimitC: 105, actual: 45.9, predicted: 49.2 },
      { tcNumber: 75, tcName: 'Left Center Encoder', run: 'Run 01', activeLimitC: 105, actual: 46.7, predicted: 51.3 },
      { tcNumber: 76, tcName: 'Ambient Between Right Encoders', run: 'Run 01', activeLimitC: 105, actual: 48.8, predicted: 51.5 },
      { tcNumber: 77, tcName: 'Right Center Encoder', run: 'Run 01', activeLimitC: 105, actual: 52.9, predicted: 52.4 },
      { tcNumber: 78, tcName: 'Right Encoder', run: 'Run 01', activeLimitC: 105, actual: 47.9, predicted: 48.9 },
      { tcNumber: 73, tcName: 'Ambient Between Left Encoders', run: 'Run 02', activeLimitC: 105, actual: 49.0, predicted: 53.0 },
      { tcNumber: 74, tcName: 'Left Encoder', run: 'Run 02', activeLimitC: 105, actual: 47.1, predicted: 48.3 },
      { tcNumber: 75, tcName: 'Left Center Encoder', run: 'Run 02', activeLimitC: 105, actual: 44.0, predicted: 45.5 },
      { tcNumber: 76, tcName: 'Ambient Between Right Encoders', run: 'Run 02', activeLimitC: 105, actual: 46.9, predicted: 51.4 },
      { tcNumber: 77, tcName: 'Right Center Encoder', run: 'Run 02', activeLimitC: 105, actual: 51.7, predicted: 51.2 },
      { tcNumber: 78, tcName: 'Right Encoder', run: 'Run 02', activeLimitC: 105, actual: 46.1, predicted: 44.8 },
      { tcNumber: 73, tcName: 'Ambient Between Left Encoders', run: 'Run 03', activeLimitC: 105, actual: 46.3, predicted: 46.0 },
      { tcNumber: 74, tcName: 'Left Encoder', run: 'Run 03', activeLimitC: 105, actual: 51.2, predicted: 52.2 },
      { tcNumber: 75, tcName: 'Left Center Encoder', run: 'Run 03', activeLimitC: 105, actual: 48.1, predicted: 50.3 },
      { tcNumber: 76, tcName: 'Ambient Between Right Encoders', run: 'Run 03', activeLimitC: 105, actual: 49.7, predicted: 54.7 },
      { tcNumber: 77, tcName: 'Right Center Encoder', run: 'Run 03', activeLimitC: 105, actual: 51.1, predicted: 51.0 },
      { tcNumber: 78, tcName: 'Right Encoder', run: 'Run 03', activeLimitC: 105, actual: 42.1, predicted: 45.0 },
      { tcNumber: 73, tcName: 'Ambient Between Left Encoders', run: 'Run 04', activeLimitC: 105, actual: 46.6, predicted: 48.4 },
      { tcNumber: 74, tcName: 'Left Encoder', run: 'Run 04', activeLimitC: 105, actual: 43.5, predicted: 46.8 },
      { tcNumber: 75, tcName: 'Left Center Encoder', run: 'Run 04', activeLimitC: 105, actual: 51.5, predicted: 51.5 },
      { tcNumber: 76, tcName: 'Ambient Between Right Encoders', run: 'Run 04', activeLimitC: 105, actual: 45.9, predicted: 43.3 },
      { tcNumber: 77, tcName: 'Right Center Encoder', run: 'Run 04', activeLimitC: 105, actual: 46.0, predicted: 45.3 },
      { tcNumber: 78, tcName: 'Right Encoder', run: 'Run 04', activeLimitC: 105, actual: 42.0, predicted: 43.5 },
      { tcNumber: 73, tcName: 'Ambient Between Left Encoders', run: 'Run 05', activeLimitC: 105, actual: 45.5, predicted: 48.0 },
      { tcNumber: 74, tcName: 'Left Encoder', run: 'Run 05', activeLimitC: 105, actual: 45.7, predicted: 47.9 },
      { tcNumber: 75, tcName: 'Left Center Encoder', run: 'Run 05', activeLimitC: 105, actual: 37.8, predicted: 43.1 },
      { tcNumber: 76, tcName: 'Ambient Between Right Encoders', run: 'Run 05', activeLimitC: 105, actual: 45.4, predicted: 42.8 },
      { tcNumber: 77, tcName: 'Right Center Encoder', run: 'Run 05', activeLimitC: 105, actual: 49.5, predicted: 52.4 },
      { tcNumber: 78, tcName: 'Right Encoder', run: 'Run 05', activeLimitC: 105, actual: 44.1, predicted: 42.8 },
    ],
  },
  {
    keyArea: 'Oven HMI',
    errorMetrics: { mae: 1.82, rmse: 2.38, r2: 0.522, mapePct: 2.96, withinTenPctRate: 1.000 },
    featureImportance: {
      blower_direction: 0.19,
      housing: 0.28,
      board_position: 0.00,
      run_case: 0.36,
      losses: 0.00,
      deflector_hole: 0.12,
      material_coil_support: 0.05,
    },
    predictedVsActual: [
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 01', activeLimitC: 85, actual: 59.1, predicted: 56.7 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 01', activeLimitC: 85, actual: 59.8, predicted: 60.7 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 01', activeLimitC: 85, actual: 65.2, predicted: 62.1 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 01', activeLimitC: 85, actual: 59.2, predicted: 60.9 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 02', activeLimitC: 85, actual: 58.1, predicted: 57.3 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 02', activeLimitC: 85, actual: 59.0, predicted: 58.4 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 02', activeLimitC: 85, actual: 65.4, predicted: 61.7 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 02', activeLimitC: 85, actual: 56.7, predicted: 57.8 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 03', activeLimitC: 85, actual: 58.3, predicted: 59.2 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 03', activeLimitC: 85, actual: 59.0, predicted: 58.8 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 03', activeLimitC: 85, actual: 62.7, predicted: 60.3 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 03', activeLimitC: 85, actual: 56.7, predicted: 59.0 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 04', activeLimitC: 85, actual: 58.7, predicted: 59.4 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 04', activeLimitC: 85, actual: 59.3, predicted: 58.2 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 04', activeLimitC: 85, actual: 65.5, predicted: 60.0 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 04', activeLimitC: 85, actual: 57.4, predicted: 57.7 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 05', activeLimitC: 85, actual: 57.1, predicted: 55.0 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 05', activeLimitC: 85, actual: 56.5, predicted: 56.3 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 05', activeLimitC: 85, actual: 67.1, predicted: 61.1 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 05', activeLimitC: 85, actual: 59.7, predicted: 56.3 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 06', activeLimitC: 85, actual: 58.7, predicted: 57.2 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 06', activeLimitC: 85, actual: 60.2, predicted: 61.8 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 06', activeLimitC: 85, actual: 62.0, predicted: 61.5 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 06', activeLimitC: 85, actual: 53.9, predicted: 55.1 },
      { tcNumber: 69, tcName: 'A33/Bellatrix Thermistor', run: 'Run 07', activeLimitC: 85, actual: 54.8, predicted: 55.5 },
      { tcNumber: 70, tcName: 'A33/Bellatrix UI Wifi', run: 'Run 07', activeLimitC: 85, actual: 55.5, predicted: 57.2 },
      { tcNumber: 71, tcName: 'A33/Bellatrix Microchip', run: 'Run 07', activeLimitC: 85, actual: 64.3, predicted: 60.1 },
      { tcNumber: 72, tcName: 'A33/Bellatrix UI LCD Screen', run: 'Run 07', activeLimitC: 85, actual: 55.0, predicted: 54.9 },
    ],
  },
]

export function metricsForArea(keyArea: string): AreaMetrics | undefined {
  return MOCK_AREA_METRICS.find((m) => m.keyArea === keyArea)
}
