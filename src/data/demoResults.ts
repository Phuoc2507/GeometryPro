export const demoResults = [
  {
    "title": "Câu 1: Đống rơm Paraboloid",
    "text": "Câu 1: Trong hệ tọa độ (Oxy), đơn vị mỗi trục là mét, mặt cắt của một đống rơm được mô hình hóa bằng hàm số bậc hai f(x) = ax^2 + bx + c có đồ thị (H) đi qua gốc tọa độ O(0;0) và cắt trục Ox tại điểm A(8;0). Một cái thang dài 5 mét được đặt theo phương tiếp tuyến với đống rơm tại điểm B ∈ (H). Chiếc thang chạm đất (trục hoành Ox) tại điểm C. Biết hoành độ của điểm B là x_B = 6, hỏi điểm cao nhất trên đống rơm cách mặt đất bao nhiêu cm?",
    "geometry": {
      
      "name": "Mặt cắt đống rơm – Parabola f(x)=x(8-x)/3",
      "tags": [
            "2D"
      ],
      "points": [
            {
                  "id": "O",
                  "label": "O(0;0)",
                  "x": 0,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "A",
                  "label": "A(8;0)",
                  "x": 8,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "B",
                  "label": "B(6;4)",
                  "x": 6,
                  "y": 4,
                  "z": 0
            },
            {
                  "id": "C",
                  "label": "C(9;0)",
                  "x": 9,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "M",
                  "label": "M(4; 16/3)",
                  "x": 4,
                  "y": 5.3333,
                  "z": 0
            },
            {
                  "id": "Mfoot",
                  "label": "",
                  "x": 4,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "groundL",
                  "label": "",
                  "x": -1,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "groundR",
                  "label": "",
                  "x": 10,
                  "y": 0,
                  "z": 0
            }
      ],
      "lines": [
            {
                  "id": "ground",
                  "from": "groundL",
                  "to": "groundR",
                  "style": "solid",
                  "label": "Trục Ox (mặt đất)"
            },
            {
                  "id": "ladder",
                  "from": "B",
                  "to": "C",
                  "style": "solid",
                  "label": "Thang 5m (tiếp tuyến tại B)"
            },
            {
                  "id": "height",
                  "from": "M",
                  "to": "Mfoot",
                  "style": "dashed",
                  "label": "h = 16/3 m = 1600/3 cm ≈ 533.33 cm"
            }
      ],
      "curves": [
            {
                  "id": "c1",
                  "type": "parabola",
                  "params": {
                        "a": -0.33333333,
                        "b": 2.66666667,
                        "c": 0,
                        "xMin": 0,
                        "xMax": 8
                  },
                  "color": "#eab308"
            }
      ],
      "circles": [],
      "spheres": [],
      "cones": [],
      "cylinders": [],
      "surfaces": [],
      "agents": [],
      "timeline": {}
},
    "step_by_step_reasoning": "1. f(0)=0 → c=0. 2. f(8)=0 → 64a+8b=0 → b=-8a. Vậy f(x)=ax(x-8). 3. f'(x)=a(2x-8). 4. Tại B(6, f(6)): f(6)=a·6·(-2)=-12a; f'(6)=4a. 5. Tiếp tuyến tại B: y-(-12a)=4a(x-6) → y=4ax-36a. Tại y=0: x=9 → C=(9,0). 6. BC=5: sqrt((9-6)²+(12a)²)=5 → 9+144a²=25 → a²=1/9 → a=-1/3 (đống rơm lồi lên). 7. f(x)=x(8-x)/3. 8. f(6)=6·2/3=4, B=(6,4), C=(9,0). Kiểm tra BC=sqrt(9+16)=5 ✓. 9. Max tại x=4: f(4)=4·4/3=16/3 m = 1600/3 cm ≈ 533.33 cm.",
    "step1": {
      "constraints": [
        "f(0)=0 → c=0",
        "f(8)=0 → b=-8a",
        "f(x)=ax(x-8), a<0 (hình lồi)",
        "x_B=6, tiếp tuyến tại B chạm Ox tại C",
        "BC=5m (chiều dài thang)",
        "Giải ra a=-1/3, f(x)=x(8-x)/3",
        "Đỉnh cao nhất tại x=4: h=16/3 m = 1600/3 cm"
      ]
    }
  },
  {
    "title": "Câu 2: Chậu nước hình chóp cụt",
    "text": "Câu 2: Anh Việt có một tấm nhôm hình tam giác đều ABC với cạnh bằng 6 (dm). Bên trong tấm nhôm này, anh vẽ thêm tam giác đều DEF sao cho hai tam giác có cùng trọng tâm, đồng thời các cạnh tương ứng song song nhau. Anh Việt muốn làm một chậu đựng nước dạng hình chóp cụt tam giác đều với đáy nhỏ là DEF và đáy lớn để hở. Anh cắt bỏ ba hình bình hành ở ba góc của tam giác ABC là AMDN, BPEQ, CSFR (như hình). Kẻ đường cao AH và gọi O là trọng tâm tam giác ABC. Đặt x = DN = DM (0 < x < 2).",
    
    
    "geometry": {
      "name": "Chóp cụt tam giác đều DEF-ABC",
      "points": [
        { "id": "A", "label": "A", "x": 0, "y": 3.464, "z": 0 },
        { "id": "B", "label": "B", "x": -3, "y": -1.732, "z": 0 },
        { "id": "C", "label": "C", "x": 3, "y": -1.732, "z": 0 },
        { "id": "O", "label": "O", "x": 0, "y": 0, "z": 0 },
        { "id": "D", "label": "D", "x": 0, "y": 1.155, "z": 0 },
        { "id": "E", "label": "E", "x": -1, "y": -0.577, "z": 0 },
        { "id": "F", "label": "F", "x": 1, "y": -0.577, "z": 0 },
        { "id": "M", "label": "M", "x": -0.667, "y": 2.309, "z": 0 },
        { "id": "N", "label": "N", "x": 0.667, "y": 2.309, "z": 0 },
        { "id": "Q", "label": "Q", "x": -2.333, "y": -0.577, "z": 0 },
        { "id": "P", "label": "P", "x": -1.667, "y": -1.732, "z": 0 },
        { "id": "R", "label": "R", "x": 1.667, "y": -1.732, "z": 0 },
        { "id": "S", "label": "S", "x": 2.333, "y": -0.577, "z": 0 }
      ],
      "lines": [],
      "planes": [
        { "id": "base", "points": ["D", "E", "F"], "color": "#94a3b8", "opacity": 0.8 },
        { "id": "side1", "points": ["M", "Q", "E", "D"], "color": "#3b82f6", "opacity": 0.7 },
        { "id": "side2", "points": ["P", "R", "F", "E"], "color": "#3b82f6", "opacity": 0.7 },
        { "id": "side3", "points": ["N", "S", "F", "D"], "color": "#3b82f6", "opacity": 0.7 },
        { "id": "cut1", "points": ["A", "M", "D", "N"], "color": "#f87171", "opacity": 0.6 },
        { "id": "cut2", "points": ["B", "Q", "E", "P"], "color": "#f87171", "opacity": 0.6 },
        { "id": "cut3", "points": ["C", "S", "F", "R"], "color": "#f87171", "opacity": 0.6 }
      ],
      "timeline": {
        "duration": 7,
        "tracks": [
          { "id": "f1", "start": 1.5, "end": 3.0, "type": "fade", "targetId": "cut1", "params": { "opacityStart": 0.6, "opacityEnd": 0 } },
          { "id": "f2", "start": 1.5, "end": 3.0, "type": "fade", "targetId": "cut2", "params": { "opacityStart": 0.6, "opacityEnd": 0 } },
          { "id": "f3", "start": 1.5, "end": 3.0, "type": "fade", "targetId": "cut3", "params": { "opacityStart": 0.6, "opacityEnd": 0 } },
          { "id": "fold1", "start": 4.0, "end": 6.0, "type": "fold", "targetId": "side1", "params": { 
              "angleStart": 0, "angleEnd": 1.25, 
              "axisPoint": {"x": 0, "y": 1.155, "z": 0}, 
              "axisDir": {"x": -1, "y": -1.732, "z": 0} 
            } 
          },
          { "id": "fold2", "start": 4.0, "end": 6.0, "type": "fold", "targetId": "side2", "params": { 
              "angleStart": 0, "angleEnd": 1.25, 
              "axisPoint": {"x": -1, "y": -0.577, "z": 0}, 
              "axisDir": {"x": 2, "y": 0, "z": 0} 
            } 
          },
          { "id": "fold3", "start": 4.0, "end": 6.0, "type": "fold", "targetId": "side3", "params": { 
              "angleStart": 0, "angleEnd": 1.25, 
              "axisPoint": {"x": 1, "y": -0.577, "z": 0}, 
              "axisDir": {"x": -1, "y": 1.732, "z": 0} 
            } 
          }
        ]
      }
    }
  },
  {
    "title": "Câu 3: Máy bay và Radar (Động học)",
    "text": "Câu 3: Một chiếc máy bay thương mại đang bay trên bầu trời theo một đường thẳng từ D đến E có hình chiếu trên mặt đất là đoạn CB. Tại vị trí D thì máy bay cách mặt đất 9000m, tại vị trí E thì máy bay cách mặt đất 12000m. Một radar được đặt trên mặt đất tại vị trí O cách C khoảng 20000m, cách B khoảng 16000m và BOC = 90 độ, phạm vi theo dõi của radar là 20km. Xét hệ trục tọa độ Oxyz (đơn vị mỗi trục là 10km).",
    "geometry": {
      "name": "Máy bay bay qua vùng radar",
      "axisUnit": "10km",
      "points": [
        { "id": "O", "label": "O (Radar)", "x": 0, "y": 0, "z": 0 },
        { "id": "C", "label": "C", "x": 2.0, "y": 0, "z": 0 },
        { "id": "B", "label": "B", "x": 0, "y": 1.6, "z": 0 },
        { "id": "D", "label": "D (máy bay)", "x": 2.0, "y": 0, "z": 0.9 },
        { "id": "E", "label": "E (máy bay)", "x": 0, "y": 1.6, "z": 1.2 }
      ],
      "lines": [
        { "id": "l1", "from": "O", "to": "C", "style": "solid" },
        { "id": "l2", "from": "O", "to": "B", "style": "solid" },
        { "id": "l3", "from": "C", "to": "B", "style": "dashed" },
        { "id": "l4", "from": "D", "to": "E", "style": "solid" },
        { "id": "l5", "from": "C", "to": "D", "style": "dotted" },
        { "id": "l6", "from": "B", "to": "E", "style": "dotted" }
      ],
      "spheres": [
        {
          "id": "sp1",
          "label": "Phạm vi radar 20km",
          "center": { "x": 0, "y": 0, "z": 0 },
          "radius": 2.0,
          "opacity": 0.15
        }
      ],
      "agents": [
        {
          "id": "plane",
          "label": "Máy bay D→E",
          "initialPosition": [2.0, 0, 0.9],
          "color": "#FFA500",
          "radius": 0.1
        }
      ],
      "timeline": {
        "duration": 15,
        "tracks": [
          {
            "id": "t1",
            "start": 0,
            "end": 10,
            "type": "parametric_path",
            "targetId": "plane",
            "params": {
              "path": "x(t) = 2.0 - 0.2*t, y(t) = 0.16*t, z(t) = 0.9 + 0.03*t"
            }
          },
          {
            "id": "t2",
            "start": 0,
            "end": 15,
            "type": "custom",
            "targetId": "plane",
            "params": {
              "description": "Báo động đỏ khi đi vào vùng radar (quãng đường từ t=0 đến t=...)"
            }
          }
        ]
      }
    }
  },
  {
    "title": "Câu 4: Đèn lồng Paraboloid",
    "text": "Câu 4: Cận kề ngày Tết Nguyên Đán, Bác Nghĩa muốn thiết kế một đèn lồng cao 40 cm để treo lên ở hiên nhà. Mặt cắt ngang tại mọi độ cao vuông góc với trục thẳng đứng của đèn lồng luôn là một hình vuông (xem hình vẽ). Mặt đáy và đỉnh của đèn lồng là hình vuông có cạnh L_0 = 10√2 (cm). Mặt cắt ngang tại vị trí rộng nhất của đèn lồng là hình vuông (hình vuông có diện tích lớn nhất) có cạnh L_max = 14√2 (cm). Mặt cắt của đèn lồng theo mặt phẳng đứng chứa đường chéo đáy có dạng là hình phẳng giới hạn bởi hai đường cong Parabol đối xứng nhau qua trục thẳng đứng đi qua tâm đáy của đèn lồng. Một đường cong Parabol y = f(x) trong bốn đường cong để tạo ra khung đèn lồng được gắn trong hệ trục Oxy với trục Ox biểu diễn chiều cao của chiếc đèn lồng (đơn vị mỗi trục là 1 cm).",
    "geometry": {
      "name": "Đèn lồng Tết hình vuông xoay parabol",
      "points": [
        { "id": "A0", "label": "A₀(đáy)", "x": 0, "y": 10, "z": 0 },
        { "id": "B0", "label": "B₀(đáy)", "x": 0, "y": 0, "z": 10 },
        { "id": "C0", "label": "C₀(đáy)", "x": 0, "y": -10, "z": 0 },
        { "id": "D0", "label": "D₀(đáy)", "x": 0, "y": 0, "z": -10 },

        { "id": "A1", "label": "A₁(giữa)", "x": 20, "y": 14, "z": 0 },
        { "id": "B1", "label": "B₁(giữa)", "x": 20, "y": 0, "z": 14 },
        { "id": "C1", "label": "C₁(giữa)", "x": 20, "y": -14, "z": 0 },
        { "id": "D1", "label": "D₁(giữa)", "x": 20, "y": 0, "z": -14 },

        { "id": "A2", "label": "A₂(đỉnh)", "x": 40, "y": 10, "z": 0 },
        { "id": "B2", "label": "B₂(đỉnh)", "x": 40, "y": 0, "z": 10 },
        { "id": "C2", "label": "C₂(đỉnh)", "x": 40, "y": -10, "z": 0 },
        { "id": "D2", "label": "D₂(đỉnh)", "x": 40, "y": 0, "z": -10 },

        { "id": "O", "label": "O(gốc)", "x": 0, "y": 0, "z": 0 },
        { "id": "Ox", "label": "H(đỉnh)", "x": 40, "y": 0, "z": 0 }
      ],
      "lines": [
        { "id": "l1", "from": "A0", "to": "B0", "style": "solid", "color": "#fbbf24" },
        { "id": "l2", "from": "B0", "to": "C0", "style": "solid", "color": "#fbbf24" },
        { "id": "l3", "from": "C0", "to": "D0", "style": "dashed", "color": "#fbbf24" },
        { "id": "l4", "from": "D0", "to": "A0", "style": "dashed", "color": "#fbbf24" },

        { "id": "l5", "from": "A1", "to": "B1", "style": "solid", "color": "#fbbf24" },
        { "id": "l6", "from": "B1", "to": "C1", "style": "solid", "color": "#fbbf24" },
        { "id": "l7", "from": "C1", "to": "D1", "style": "dashed", "color": "#fbbf24" },
        { "id": "l8", "from": "D1", "to": "A1", "style": "dashed", "color": "#fbbf24" },

        { "id": "l9", "from": "A2", "to": "B2", "style": "solid", "color": "#fbbf24" },
        { "id": "l10", "from": "B2", "to": "C2", "style": "solid", "color": "#fbbf24" },
        { "id": "l11", "from": "C2", "to": "D2", "style": "solid", "color": "#fbbf24" },
        { "id": "l12", "from": "D2", "to": "A2", "style": "solid", "color": "#fbbf24" },
        
        { "id": "axis", "from": "O", "to": "Ox", "style": "dashed", "color": "#a1a1aa" }
      ],
      "curves": [
        {
          "id": "c1",
          "type": "parabola",
          "plane": "xy",
          "color": "#ef4444",
          "style": "solid",
          "params": {
            "a": -0.01,
            "b": 0.4,
            "c": 10,
            "xMin": 0,
            "xMax": 40
          }
        },
        {
          "id": "c2",
          "type": "parabola",
          "plane": "xy",
          "color": "#ef4444",
          "style": "dashed",
          "params": {
            "a": 0.01,
            "b": -0.4,
            "c": -10,
            "xMin": 0,
            "xMax": 40
          }
        },
        {
          "id": "c3",
          "type": "parabola",
          "plane": "xz",
          "color": "#ef4444",
          "style": "solid",
          "params": {
            "a": -0.01,
            "b": 0.4,
            "c": 10,
            "xMin": 0,
            "xMax": 40
          }
        },
        {
          "id": "c4",
          "type": "parabola",
          "plane": "xz",
          "color": "#ef4444",
          "style": "dashed",
          "params": {
            "a": 0.01,
            "b": -0.4,
            "c": -10,
            "xMin": 0,
            "xMax": 40
          }
        }
      ]
    }
  },
  {
    "title": "Câu 5: Hồ bơi hình thang cong",
    "text": "Câu 5: Anh Nghĩa có một mảnh đất dạng hình thang cong OABC (B là điểm cực đại của đồ thị hàm số y = f(x)) được mô hình hóa trong mặt phẳng Oxy (đơn vị mỗi trục là 10m). Anh Nghĩa chia mảnh đất hình thang cong OABC thành 2 phần để làm hồ bơi và làm vườn trồng cỏ được ngăn cách bởi một phần của đồ thị hàm bậc ba y = f(x) như hình vẽ bên.",
    "geometry": {
      "name": "Hình thang cong OABC",
      "tags": [
        "2D"
      ],
      "points": [
        { "id": "O", "label": "O", "x": 0, "y": 0, "z": 0 },
        { "id": "A", "label": "A", "x": 0, "y": 4, "z": 0 },
        { "id": "B", "label": "B", "x": 2, "y": 4, "z": 0 },
        { "id": "C", "label": "C", "x": 3, "y": 0, "z": 0 },
        { "id": "M", "label": "M", "x": 2.667, "y": 2.37, "z": 0 },
        { "id": "N", "label": "N", "x": 3.5, "y": 3, "z": 0 }
      ],
      "lines": [
        { "id": "l1", "from": "O", "to": "A", "style": "solid" },
        { "id": "l2", "from": "A", "to": "B", "style": "solid" },
        { "id": "l3", "from": "C", "to": "O", "style": "solid" },
        { "id": "mn", "from": "M", "to": "N", "style": "dashed" }
      ],
      "curves": [
        {
          "id": "curve_f",
          "type": "cubic",
          "params": {
            "a": -1,
            "b": 3,
            "c": 0,
            "d": 0,
            "xMin": 0,
            "xMax": 3
          },
          "color": "#10b981",
          "style": "solid"
        },
        {
          "id": "curve_g",
          "type": "rational",
          "params": {
            "numA": 1,
            "numB": 1,
            "denA": 1,
            "denB": -2,
            "xMin": 2.2,
            "xMax": 5.5
          },
          "color": "#3b82f6",
          "style": "dashed"
        }
      ]
    }
  },
  {
    "title": "Câu 6: Khối trang trí chóp tứ giác",
    "text": "Câu 6: Một khối trang trí trong suốt có dạng khối chóp tứ giác đều có tất cả các cạnh đều bằng 20 (cm). Khối chóp đó có phần rỗng bên trong chứa dung dịch màu. Biết rằng phần rỗng đó được tạo thành từ đỉnh, tâm của đáy và trọng tâm bốn mặt bên của khối chóp tứ giác đều ban đầu.",
    "geometry": {
      "name": "Khối chóp tứ giác đều với lõi rỗng",
      "points": [
        {
          "id": "A",
          "label": "A",
          "x": -10,
          "y": -10,
          "z": 0
        },
        {
          "id": "B",
          "label": "B",
          "x": 10,
          "y": -10,
          "z": 0
        },
        {
          "id": "C",
          "label": "C",
          "x": 10,
          "y": 10,
          "z": 0
        },
        {
          "id": "D",
          "label": "D",
          "x": -10,
          "y": 10,
          "z": 0
        },
        {
          "id": "S",
          "label": "S",
          "x": 0,
          "y": 0,
          "z": 14.142
        },
        {
          "id": "O",
          "label": "O",
          "x": 0,
          "y": 0,
          "z": 0
        },
        {
          "id": "G1",
          "label": "G₁(SAB)",
          "x": 0,
          "y": -6.667,
          "z": 4.714
        },
        {
          "id": "G2",
          "label": "G₂(SBC)",
          "x": 6.667,
          "y": 0,
          "z": 4.714
        },
        {
          "id": "G3",
          "label": "G₃(SCD)",
          "x": 0,
          "y": 6.667,
          "z": 4.714
        },
        {
          "id": "G4",
          "label": "G₄(SDA)",
          "x": -6.667,
          "y": 0,
          "z": 4.714
        }
      ],
      "lines": [
        {
          "id": "l1",
          "from": "A",
          "to": "B",
          "style": "solid"
        },
        {
          "id": "l2",
          "from": "B",
          "to": "C",
          "style": "solid"
        },
        {
          "id": "l3",
          "from": "C",
          "to": "D",
          "style": "solid"
        },
        {
          "id": "l4",
          "from": "D",
          "to": "A",
          "style": "solid"
        },
        {
          "id": "l5",
          "from": "S",
          "to": "A",
          "style": "solid"
        },
        {
          "id": "l6",
          "from": "S",
          "to": "B",
          "style": "solid"
        },
        {
          "id": "l7",
          "from": "S",
          "to": "C",
          "style": "solid"
        },
        {
          "id": "l8",
          "from": "S",
          "to": "D",
          "style": "solid"
        },
        {
          "id": "l9",
          "from": "S",
          "to": "G1",
          "style": "dashed"
        },
        {
          "id": "l10",
          "from": "S",
          "to": "G2",
          "style": "dashed"
        },
        {
          "id": "l11",
          "from": "S",
          "to": "G3",
          "style": "dashed"
        },
        {
          "id": "l12",
          "from": "S",
          "to": "G4",
          "style": "dashed"
        },
        {
          "id": "l13",
          "from": "O",
          "to": "G1",
          "style": "dashed"
        },
        {
          "id": "l14",
          "from": "O",
          "to": "G2",
          "style": "dashed"
        },
        {
          "id": "l15",
          "from": "O",
          "to": "G3",
          "style": "dashed"
        },
        {
          "id": "l16",
          "from": "O",
          "to": "G4",
          "style": "dashed"
        },
        {
          "id": "l17",
          "from": "G1",
          "to": "G2",
          "style": "dashed"
        },
        {
          "id": "l18",
          "from": "G2",
          "to": "G3",
          "style": "dashed"
        },
        {
          "id": "l19",
          "from": "G3",
          "to": "G4",
          "style": "dashed"
        },
        {
          "id": "l20",
          "from": "G4",
          "to": "G1",
          "style": "dashed"
        }
      ]
    }
  },
  {
    "title": "Câu 7: Đèn LED dây",
    "text": "Câu 7: Nhân dịp ngày Tết cổ truyền, anh Nghĩa dự định trang trí hệ thống đèn LED cho khoảng sân nhà hình chữ nhật MNPQ có chiều dài MQ = 12m, MN = 8m. Để cung cấp điện cho hệ thống đèn LED, anh Nghĩa đi dây điện theo trình tự: A -> B -> C -> O -> D -> E -> F -> H. (Trong đó A cao 3m cách M 3m, BC dài 3m trên tường PQIJ cao 4m, O trên mái che IJUV dài 10m, D cao 3m tại N, E F trên cây Nêu MG cao 10m cách nhau 2m, H cách G 0.5m). Tính tổng độ dài dây điện ngắn nhất.",
    "geometry": {
      "name": "Hệ thống đèn LED dây (Lời giải tối ưu)",
      "points": [
        { "id": "M", "label": "M", "x": 0, "y": 0, "z": 0 },
        { "id": "N", "label": "N", "x": 8, "y": 0, "z": 0 },
        { "id": "P", "label": "P", "x": 8, "y": 12, "z": 0 },
        { "id": "Q", "label": "Q", "x": 0, "y": 12, "z": 0 },
        
        { "id": "A_base", "label": "", "x": 0, "y": 3, "z": 0 },
        { "id": "A", "label": "A", "x": 0, "y": 3, "z": 3 },
        
        { "id": "I", "label": "I", "x": 0, "y": 12, "z": 4 },
        { "id": "J", "label": "J", "x": 8, "y": 12, "z": 4 },
        { "id": "B", "label": "B", "x": 15/7, "y": 12, "z": 27/7 },
        { "id": "C", "label": "C", "x": 36/7, "y": 12, "z": 27/7 },
        
        { "id": "U", "label": "U", "x": 8, "y": 2, "z": 4 },
        { "id": "V", "label": "V", "x": 0, "y": 2, "z": 4 },
        { "id": "O", "label": "O", "x": 5.5, "y": 10.5, "z": 4 },
        
        { "id": "D", "label": "D", "x": 8, "y": 0, "z": 3 },
        
        { "id": "G", "label": "G", "x": 0, "y": 0, "z": 10 },
        { "id": "E", "label": "E", "x": 0, "y": 0, "z": 131/17 },
        { "id": "F", "label": "F", "x": 0, "y": 0, "z": 165/17 },
        
        { "id": "H", "label": "H", "x": -0.5, "y": 0, "z": 10 }
      ],
      "lines": [
        { "id": "lMN", "from": "M", "to": "N", "style": "solid", "color": "#a1a1aa" },
        { "id": "lNP", "from": "N", "to": "P", "style": "solid", "color": "#a1a1aa" },
        { "id": "lPQ", "from": "P", "to": "Q", "style": "solid", "color": "#a1a1aa" },
        { "id": "lQM", "from": "Q", "to": "M", "style": "solid", "color": "#a1a1aa" },
        
        { "id": "hA", "from": "A_base", "to": "A", "style": "dashed", "color": "#a1a1aa" },
        { "id": "hD", "from": "N", "to": "D", "style": "solid", "color": "#a1a1aa" },
        
        { "id": "lQI", "from": "Q", "to": "I", "style": "solid", "color": "#a1a1aa" },
        { "id": "lPJ", "from": "P", "to": "J", "style": "solid", "color": "#a1a1aa" },
        { "id": "lIJ", "from": "I", "to": "J", "style": "solid", "color": "#a1a1aa" },
        
        { "id": "lIV", "from": "I", "to": "V", "style": "dashed", "color": "#a1a1aa" },
        { "id": "lJU", "from": "J", "to": "U", "style": "dashed", "color": "#a1a1aa" },
        { "id": "lVU", "from": "V", "to": "U", "style": "dashed", "color": "#a1a1aa" },
        
        { "id": "lMG", "from": "M", "to": "G", "style": "solid", "color": "#a1a1aa" },
        { "id": "lGH", "from": "G", "to": "H", "style": "dashed", "color": "#a1a1aa" },
        
        { "id": "lAB", "from": "A", "to": "B", "style": "solid", "color": "#fbbf24" },
        { "id": "lBC", "from": "B", "to": "C", "style": "solid", "color": "#fbbf24" },
        { "id": "lCO", "from": "C", "to": "O", "style": "solid", "color": "#fbbf24" },
        { "id": "lOD", "from": "O", "to": "D", "style": "solid", "color": "#fbbf24" },
        { "id": "lDE", "from": "D", "to": "E", "style": "solid", "color": "#fbbf24" },
        { "id": "lEF", "from": "E", "to": "F", "style": "solid", "color": "#fbbf24" },
        { "id": "lFH", "from": "F", "to": "H", "style": "solid", "color": "#fbbf24" }
      ]
    },
    "step_by_step_reasoning": "Độ dài dây điện ngắn nhất là 36.5m. Tính bằng cách trải phẳng (unfold) các mặt phẳng chứa dây. Đoạn A->D trải phẳng tường và mái che cho ta khoảng cách √470 ≈ 21.68m, cộng thêm BC=3m. Đoạn D->H trải phẳng quanh cây Nêu cho ta khoảng cách √97.25 ≈ 9.86m, cộng thêm EF=2m. Tổng = 36.54m.",
    "step1": {
      "constraints": [
        "A -> B -> C -> O -> D -> E -> F -> H"
      ]
    }
  },
  {
    "title": "Câu 8: Nón Trụ lồng nhau",
    "text": "Câu 8: Tìm thể tích phần giao nhau của khối nón (N) và khối trụ (T) biết rằng chúng có cùng chiều cao 4 dm, hai đường tròn đáy đồng phẳng và có bán kính cùng bằng 2 dm, đồng thời trục của hình nón là một đường sinh của hình trụ.",
    "geometry": {
      
      "name": "Giao khối trụ-nón",
      "points": [
            {
                  "id": "O1",
                  "label": "O₁",
                  "x": 0,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "O2",
                  "label": "O₂",
                  "x": 0,
                  "y": 0,
                  "z": 4
            },
            {
                  "id": "O3",
                  "label": "O₃ ≡ A",
                  "x": 2,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "S",
                  "label": "S ≡ E",
                  "x": 2,
                  "y": 0,
                  "z": 4
            },
            {
                  "id": "B",
                  "label": "B",
                  "x": 0,
                  "y": 2,
                  "z": 0
            },
            {
                  "id": "C",
                  "label": "C",
                  "x": -2,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "D",
                  "label": "D",
                  "x": 0,
                  "y": -2,
                  "z": 0
            },
            {
                  "id": "F",
                  "label": "F",
                  "x": 0,
                  "y": 2,
                  "z": 4
            },
            {
                  "id": "G",
                  "label": "G",
                  "x": -2,
                  "y": 0,
                  "z": 4
            },
            {
                  "id": "H",
                  "label": "H",
                  "x": 0,
                  "y": -2,
                  "z": 4
            },
            {
                  "id": "K1",
                  "label": "K₁",
                  "x": 4,
                  "y": 0,
                  "z": 0
            },
            {
                  "id": "K2",
                  "label": "K₂",
                  "x": 2,
                  "y": 2,
                  "z": 0
            },
            {
                  "id": "K3",
                  "label": "K₃",
                  "x": 2,
                  "y": -2,
                  "z": 0
            }
      ],
      "lines": [
            {
                  "id": "l1",
                  "from": "O3",
                  "to": "S",
                  "style": "solid"
            },
            {
                  "id": "l2",
                  "from": "B",
                  "to": "F",
                  "style": "solid"
            },
            {
                  "id": "l3",
                  "from": "C",
                  "to": "G",
                  "style": "solid"
            },
            {
                  "id": "l4",
                  "from": "D",
                  "to": "H",
                  "style": "solid"
            },
            {
                  "id": "l5",
                  "from": "S",
                  "to": "K1",
                  "style": "solid"
            },
            {
                  "id": "l6",
                  "from": "S",
                  "to": "K2",
                  "style": "solid"
            },
            {
                  "id": "l7",
                  "from": "S",
                  "to": "O1",
                  "style": "solid"
            },
            {
                  "id": "l8",
                  "from": "S",
                  "to": "K3",
                  "style": "solid"
            },
            {
                  "id": "l9",
                  "from": "O1",
                  "to": "O3",
                  "style": "dashed"
            },
            {
                  "id": "l10",
                  "from": "O1",
                  "to": "B",
                  "style": "dashed"
            },
            {
                  "id": "l11",
                  "from": "O1",
                  "to": "C",
                  "style": "dashed"
            },
            {
                  "id": "l12",
                  "from": "O1",
                  "to": "D",
                  "style": "dashed"
            },
            {
                  "id": "l13",
                  "from": "O3",
                  "to": "K1",
                  "style": "dashed"
            },
            {
                  "id": "l14",
                  "from": "O3",
                  "to": "K2",
                  "style": "dashed"
            },
            {
                  "id": "l15",
                  "from": "O3",
                  "to": "K3",
                  "style": "dashed"
            }
      ],
      "cylinders": [
            {
                  "id": "cyl1",
                  "center1": {
                        "x": 0,
                        "y": 0,
                        "z": 0
                  },
                  "center2": {
                        "x": 0,
                        "y": 0,
                        "z": 4
                  },
                  "radius": 2,
                  "label": "Trụ (T)"
            }
      ],
      "cones": [
            {
                  "id": "cone1",
                  "apex": {
                        "x": 2,
                        "y": 0,
                        "z": 4
                  },
                  "baseCenter": {
                        "x": 2,
                        "y": 0,
                        "z": 0
                  },
                  "radius": 2,
                  "label": "Nón (N)"
            }
      ],
      "tags": [
            "3D",
            "Round_Bodies",
            "Static",
            "Intersection",
            "Volume_Area",
            "Integral_Cross_Section"
      ],
      "detailLevel": "static"
}
  },
  {
    "title": "Câu 9: Quả cầu thăng bằng 3 cột",
    "text": "Câu 9: Trong không gian Oxyz (đơn vị trên mỗi trục tính bằng mét) với mặt đất trùng với mặt phẳng (Oxy). Cho ba cây cột thẳng đứng có gốc đặt tại các điểm A(0; 0; 0), B(4; 0; 0), C(0; 4; 0) với chiều cao lần lượt là 10 mét; 6 mét; 6 mét. Đặt một quả cầu lên trên 3 cây cột này sao cho nó đứng thẳng bằng thì thấy điểm cao nhất của quả cầu so với mặt đất là 14 mét.",
    "geometry": {
      "name": "Ba cột và quả cầu",
      "points": [
        {
          "id": "A",
          "label": "A",
          "x": 0,
          "y": 0,
          "z": 0
        },
        {
          "id": "B",
          "label": "B",
          "x": 4,
          "y": 0,
          "z": 0
        },
        {
          "id": "C",
          "label": "C",
          "x": 0,
          "y": 4,
          "z": 0
        },
        {
          "id": "A1",
          "label": "A'",
          "x": 0,
          "y": 0,
          "z": 10
        },
        {
          "id": "B1",
          "label": "B'",
          "x": 4,
          "y": 0,
          "z": 6
        },
        {
          "id": "C1",
          "label": "C'",
          "x": 0,
          "y": 4,
          "z": 6
        },
        {
          "id": "I",
          "label": "I",
          "x": 2,
          "y": 2,
          "z": 8
        },
        {
          "id": "Top",
          "label": "Đỉnh",
          "x": 2,
          "y": 2,
          "z": 14
        }
      ],
      "lines": [
        {
          "id": "col1",
          "from": "A",
          "to": "A1",
          "style": "solid"
        },
        {
          "id": "col2",
          "from": "B",
          "to": "B1",
          "style": "solid"
        },
        {
          "id": "col3",
          "from": "C",
          "to": "C1",
          "style": "solid"
        },
        {
          "id": "r1",
          "from": "I",
          "to": "A1",
          "style": "dashed"
        },
        {
          "id": "r2",
          "from": "I",
          "to": "B1",
          "style": "dashed"
        },
        {
          "id": "r3",
          "from": "I",
          "to": "C1",
          "style": "dashed"
        },
        {
          "id": "h",
          "from": "I",
          "to": "Top",
          "style": "dashed"
        }
      ],
      "spheres": [
        {
          "id": "ball",
          "center": {
            "x": 2,
            "y": 2,
            "z": 8
          },
          "radius": 3.464
        }
      ]
    }
  },
  {
    "title": "Câu 10: Bóng đổ tấm pin",
    "text": "Câu 10: Một tấm pin năng lượng mặt trời hình chữ nhật ABCD có kích thước AB = 2m và BC = 3m. Tấm pin được đặt nghiêng sao cho cạnh AB nằm sát trên mặt đất phẳng. Một bóng đèn (xem như một điểm) được đặt tại vị trí S cao 4m có hình chiếu vuông góc lên mặt đất trùng với trung điểm I của cạnh AB. Vào buổi tối khi bật đèn lên bóng của tấm pin trên mặt đất tạo thành một hình thang cân ABC'D'.",
    "geometry": {
      "name": "Tấm pin nghiêng và bóng đổ",
      "points": [
        { "id": "A", "label": "A", "x": -1, "y": 0, "z": 0 },
        { "id": "B", "label": "B", "x": 1, "y": 0, "z": 0 },
        { "id": "I", "label": "I", "x": 0, "y": 0, "z": 0 },
        { "id": "S", "label": "S (Đèn)", "x": 0, "y": 0, "z": 4 },
        { "id": "C", "label": "C", "x": 1, "y": 1.8, "z": 2.4 },
        { "id": "D", "label": "D", "x": -1, "y": 1.8, "z": 2.4 },
        { "id": "Cp", "label": "C' (bóng)", "x": 2.5, "y": 4.5, "z": 0 },
        { "id": "Dp", "label": "D' (bóng)", "x": -2.5, "y": 4.5, "z": 0 }
      ],
      "lines": [
        {
          "id": "l1",
          "from": "A",
          "to": "B",
          "style": "solid"
        },
        {
          "id": "l2",
          "from": "B",
          "to": "C",
          "style": "solid"
        },
        {
          "id": "l3",
          "from": "C",
          "to": "D",
          "style": "solid"
        },
        {
          "id": "l4",
          "from": "D",
          "to": "A",
          "style": "solid"
        },
        {
          "id": "l5",
          "from": "S",
          "to": "A",
          "style": "dashed"
        },
        {
          "id": "l6",
          "from": "S",
          "to": "B",
          "style": "dashed"
        },
        {
          "id": "l7",
          "from": "S",
          "to": "C",
          "style": "dashed"
        },
        {
          "id": "l8",
          "from": "S",
          "to": "D",
          "style": "dashed"
        },
        {
          "id": "l9",
          "from": "A",
          "to": "B",
          "style": "solid"
        },
        {
          "id": "l10",
          "from": "B",
          "to": "Cp",
          "style": "solid"
        },
        {
          "id": "l11",
          "from": "Cp",
          "to": "Dp",
          "style": "solid"
        },
        {
          "id": "l12",
          "from": "Dp",
          "to": "A",
          "style": "solid"
        },
        {
          "id": "l13",
          "from": "I",
          "to": "S",
          "style": "dotted"
        }
      ],
      "spheres": [
        {
          "id": "sp1",
          "center": {
            "x": 0,
            "y": 0,
            "z": 4
          },
          "radius": 0.15,
          "color": "#FFD700"
        }
      ]
    }
  }
];
