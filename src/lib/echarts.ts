/**
 * Punto único de entrada a ECharts.
 *
 * Las importaciones son estáticas y con nombre para que Rollup pueda
 * eliminar todo lo que no se usa. El módulo completo se carga de forma
 * diferida (`await import('../lib/echarts')`) cuando un gráfico entra en
 * viewport, de modo que la biblioteca nunca bloquea el renderizado inicial.
 *
 * Si en el futuro se necesita otro tipo de gráfico (barras, dispersión…),
 * hay que registrarlo aquí y no en cada componente.
 */

import { init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts } from 'echarts/core';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export { init };
export type { ECharts };
