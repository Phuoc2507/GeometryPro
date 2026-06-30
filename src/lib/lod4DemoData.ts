import { GeometryData } from '@/types/geometry';

export const lod4DemoData: GeometryData = {
  name: 'LOD 4: Rescue Optimization',
  points: [
    { id: 'O', label: 'O', x: 0, y: 0, z: 0 },
    { id: 'A0', label: 'A0', x: 2, y: 0, z: 0 },
    { id: 'A1', label: 'A1', x: 1, y: 1.732, z: 0 },
    { id: 'A2', label: 'A2', x: -1, y: 1.732, z: 0 },
    { id: 'A3', label: 'A3', x: -2, y: 0, z: 0 },
    { id: 'A4', label: 'A4', x: -1, y: -1.732, z: 0 },
    { id: 'A5', label: 'A5', x: 1, y: -1.732, z: 0 },
  ],
  lines: [
    { id: 'l1', from: 'A0', to: 'A1' },
    { id: 'l2', from: 'A1', to: 'A2' },
    { id: 'l3', from: 'A2', to: 'A3' },
    { id: 'l4', from: 'A3', to: 'A4' },
    { id: 'l5', from: 'A4', to: 'A5' },
    { id: 'l6', from: 'A5', to: 'A0' },
  ],
  surfaces: [
    {
      id: 'roof',
      type: 'hyperboloid',
      center: { x: 0, y: 0, z: 0.5 },
      params: { a: 2, b: 2, c: 1.5, vMin: -0.327, vMax: 1.098 },
      color: '#a855f7',
      opacity: 0.4
    }
  ],
  agents: [
    {
      id: 'rescuer',
      label: 'Cứu hộ',
      initialPosition: [0, 2.97, 2.147],
      color: '#eab308', // yellow
      radius: 0.3
    },
    {
      id: 'victim',
      label: 'Nạn nhân',
      initialPosition: [2.5, 1.5, 0],
      color: '#ef4444', // red
      radius: 0.3
    }
  ],
  timeline: {
    duration: 10000, // 10 seconds
    tracks: [
      {
        id: 'water_rise',
        type: 'water_level',
        start: 3,
        end: 6,
        params: {
          height_function: 'h(t) = 0.3 * (t - 3)' // t is global
        }
      },
      {
        id: 'water_recede',
        type: 'water_level',
        start: 6,
        end: 9,
        params: {
          height_function: 'h(t) = 0.9 - 0.3 * (t - 6)', // t is global time
          final_height: 0
        }
      },
      {
        id: 'tent_move',
        type: 'translate',
        start: 3,
        end: 8,
        params: {
          displacement_function: 'D(t) = [0.4*(t-3), 0.2*(t-3), 0]', // t is global time
          final_position: [2, 1, 0]
        }
      },
      {
        id: 'jump',
        type: 'parametric_path',
        targetId: 'rescuer',
        start: 8,
        end: 9,
        params: {
          x_start: 2.0,
          y_start: 3.97,
          z_start: 2.147,
          vx: 0.5,
          vy: -2.47,
          vz: 2.753,
          equations: {
            x: 'x_start + vx*t', // t here is local dt for parametric_path
            y: 'y_start + vy*t',
            z: 'z_start + vz*t - 4.9*t^2'
          },
          landing_point: [2.5, 1.5, 0]
        }
      }
    ]
  }
};
