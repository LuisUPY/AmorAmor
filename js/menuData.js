// Catálogo literal. Precios en MXN; null requiere confirmación.
const menuDB = {
  "Entradas": {
    "Para compartir": [
      {
        "id": "orden-de-pan-tostado",
        "nombre": "Orden de pan tostado",
        "precio": 60,
        "descripcion": "3 panes, mantequilla y mermelada.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "orden-de-fruta",
        "nombre": "Orden de fruta",
        "precio": 80,
        "descripcion": "Papaya, melón, sandía y plátano.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "yogurt-natural",
                "nombre": "Yogurt natural",
                "precioExtra": 30
              },
              {
                "id": "granola",
                "nombre": "Granola",
                "precioExtra": 30
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "orden-de-papas",
        "nombre": "Orden de papas",
        "precio": 65,
        "descripcion": "Orden de papas de 200 g.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      }
    ]
  },
  "Bebidas": {
    "Aguas naturales": [
      {
        "id": "agua-de-sandia",
        "nombre": "Agua de sandía",
        "precio": 40,
        "descripcion": "Agua natural de sandía.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-melon",
        "nombre": "Agua de melón",
        "precio": 40,
        "descripcion": "Agua natural de melón.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-papaya",
        "nombre": "Agua de papaya",
        "precio": 40,
        "descripcion": "Agua natural de papaya.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "limonada",
        "nombre": "Limonada",
        "precio": 40,
        "descripcion": "Limonada.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "naranjada",
        "nombre": "Naranjada",
        "precio": 40,
        "descripcion": "Naranjada.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-pina",
        "nombre": "Agua de piña",
        "precio": 40,
        "descripcion": "Agua natural de piña.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-fresa-con-limon",
        "nombre": "Agua de fresa con limón",
        "precio": 50,
        "descripcion": "Agua natural de fresa con limón.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-pepino-con-limon",
        "nombre": "Agua de pepino con limón",
        "precio": 50,
        "descripcion": "Agua natural de pepino con limón.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-pepino-con-limon-y-chia",
        "nombre": "Agua de pepino con limón y chía",
        "precio": 55,
        "descripcion": "Agua natural de pepino con limón y chía.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-fresa-con-limon-y-chia",
        "nombre": "Agua de fresa con limón y chía",
        "precio": 55,
        "descripcion": "Agua natural de fresa con limón y chía.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "agua-de-fresa-con-chia",
        "nombre": "Agua de fresa con chía",
        "precio": 55,
        "descripcion": "Agua natural de fresa con chía.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "limonada-con-chia",
        "nombre": "Limonada con chía",
        "precio": 45,
        "descripcion": "Limonada con chía.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "jugo-de-naranja",
        "nombre": "Jugo de naranja",
        "precio": 50,
        "descripcion": "Jugo de naranja.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      }
    ],
    "Bebidas rellenables": [
      {
        "id": "te-helado",
        "nombre": "Té helado",
        "precio": 55,
        "descripcion": "Bebida rellenable.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "horchata",
        "nombre": "Horchata",
        "precio": 55,
        "descripcion": "Bebida rellenable.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "tamarindo",
        "nombre": "Tamarindo",
        "precio": 55,
        "descripcion": "Bebida rellenable.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "jamaica",
        "nombre": "Jamaica",
        "precio": 55,
        "descripcion": "Bebida rellenable.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      }
    ],
    "Jugos nutritivos": [
      {
        "id": "jugo-verde",
        "nombre": "Jugo verde",
        "precio": 60,
        "descripcion": "Pepino, espinaca, piña, apio y jugo de naranja.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "detox",
        "nombre": "Detox",
        "precio": 60,
        "descripcion": "Papaya, zanahoria y jugo de naranja.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      },
      {
        "id": "vampiro",
        "nombre": "Vampiro",
        "precio": 60,
        "descripcion": "Remolacha, zanahoria y jugo de naranja.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      }
    ],
    "Cafés": [
      {
        "id": "espresso",
        "nombre": "Espresso",
        "precio": 50,
        "descripcion": "Café espresso.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "cafe-americano",
        "nombre": "Café americano",
        "precio": 65,
        "descripcion": "Café americano.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "cafe-americano-refil",
        "nombre": "Café americano (refil)",
        "precio": 75,
        "descripcion": "Café americano rellenable.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "descafeinado-refil",
        "nombre": "Descafeinado (refil)",
        "precio": 75,
        "descripcion": "Café descafeinado rellenable.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "mocha",
        "nombre": "Mocha",
        "precio": 80,
        "descripcion": "Café mocha.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "capuchino",
        "nombre": "Capuchino",
        "precio": 80,
        "descripcion": "Café dulce y cremoso, 1 shot.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte",
        "nombre": "Latte",
        "precio": 80,
        "descripcion": "Café suave, 1 shot.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "flat-white",
        "nombre": "Flat white",
        "precio": 85,
        "descripcion": "Más intensidad, 2 shots.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "dirty-chai",
        "nombre": "Dirty chai",
        "precio": null,
        "descripcion": "Dirty chai. El precio no aparece en el menú.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        },
        "estadoPrecio": "pendiente",
        "notaFuente": "Sin precio impreso. Confirma el importe antes de vender; no se usa cero ni se infiere un precio."
      }
    ],
    "Sin café": [
      {
        "id": "taro",
        "nombre": "Taro",
        "precio": 80,
        "descripcion": "Bebida sin café.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "matcha",
        "nombre": "Matcha",
        "precio": 80,
        "descripcion": "Bebida sin café.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "chai",
        "nombre": "Chai",
        "precio": 80,
        "descripcion": "Bebida sin café.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "chocolate-cremoso",
        "nombre": "Chocolate cremoso",
        "precio": 80,
        "descripcion": "Bebida sin café.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      }
    ],
    "Lattes saborizados": [
      {
        "id": "latte-de-vainilla",
        "nombre": "Latte de vainilla",
        "precio": 85,
        "descripcion": "Latte saborizado de vainilla.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-de-caramelo",
        "nombre": "Latte de caramelo",
        "precio": 85,
        "descripcion": "Latte saborizado de caramelo.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-de-avellana",
        "nombre": "Latte de avellana",
        "precio": 85,
        "descripcion": "Latte saborizado de avellana.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-de-crema-irlandesa",
        "nombre": "Latte de crema irlandesa",
        "precio": 85,
        "descripcion": "Latte saborizado de crema irlandesa.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      }
    ],
    "Lattes Amor": [
      {
        "id": "latte-amor-cinnamon-roll",
        "nombre": "Latte Amor Cinnamon roll",
        "precio": 90,
        "descripcion": "Latte Amor sabor cinnamon roll.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-lotus",
        "nombre": "Latte Amor Lotus",
        "precio": 90,
        "descripcion": "Latte Amor sabor lotus.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-tiramisu",
        "nombre": "Latte Amor Tiramisú",
        "precio": 90,
        "descripcion": "Latte Amor sabor tiramisú.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-nutella",
        "nombre": "Latte Amor Nutella",
        "precio": 90,
        "descripcion": "Latte Amor sabor nutella.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-coco",
        "nombre": "Latte Amor Coco",
        "precio": 90,
        "descripcion": "Latte Amor sabor coco.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-arroz-con-leche",
        "nombre": "Latte Amor Arroz con leche",
        "precio": 90,
        "descripcion": "Latte Amor sabor arroz con leche.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-horchata",
        "nombre": "Latte Amor Horchata",
        "precio": 90,
        "descripcion": "Latte Amor sabor horchata.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-mazapan",
        "nombre": "Latte Amor Mazapán",
        "precio": 90,
        "descripcion": "Latte Amor sabor mazapán.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "latte-amor-oreo",
        "nombre": "Latte Amor Oreo",
        "precio": 90,
        "descripcion": "Latte Amor sabor oreo.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "shot-de-espresso",
                "nombre": "Shot de espresso",
                "precioExtra": 25
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      }
    ],
    "Sodas italianas": [
      {
        "id": "soda-italiana-mango",
        "nombre": "Soda italiana mango",
        "precio": 70,
        "descripcion": "Soda italiana sabor mango.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "soda-italiana-mora-azul",
        "nombre": "Soda italiana mora azul",
        "precio": 70,
        "descripcion": "Soda italiana sabor mora azul.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "soda-italiana-frutos-rojos",
        "nombre": "Soda italiana frutos rojos",
        "precio": 70,
        "descripcion": "Soda italiana sabor frutos rojos.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      },
      {
        "id": "soda-italiana-limonada-rosa",
        "nombre": "Soda italiana limonada rosa",
        "precio": 70,
        "descripcion": "Soda italiana sabor limonada rosa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 7
        }
      }
    ],
    "Licuados": [
      {
        "id": "licuado-chocomilk",
        "nombre": "Licuado chocomilk",
        "precio": 50,
        "descripcion": "Licuado de chocomilk.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "granola",
                "nombre": "Granola",
                "precioExtra": 10
              },
              {
                "id": "miel",
                "nombre": "Miel",
                "precioExtra": 10
              },
              {
                "id": "avena",
                "nombre": "Avena",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "licuado-platano",
        "nombre": "Licuado plátano",
        "precio": 50,
        "descripcion": "Licuado de plátano.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "granola",
                "nombre": "Granola",
                "precioExtra": 10
              },
              {
                "id": "miel",
                "nombre": "Miel",
                "precioExtra": 10
              },
              {
                "id": "avena",
                "nombre": "Avena",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "licuado-fresa-con-platano",
        "nombre": "Licuado fresa con plátano",
        "precio": 60,
        "descripcion": "Licuado de fresa con plátano.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              },
              {
                "id": "granola",
                "nombre": "Granola",
                "precioExtra": 10
              },
              {
                "id": "miel",
                "nombre": "Miel",
                "precioExtra": 10
              },
              {
                "id": "avena",
                "nombre": "Avena",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      }
    ],
    "Frappés": [
      {
        "id": "frappe-oreo",
        "nombre": "Frappé Oreo",
        "precio": 80,
        "descripcion": "Frappé sabor oreo.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-mamut",
        "nombre": "Frappé Mamut",
        "precio": 80,
        "descripcion": "Frappé sabor mamut.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-choco-roll",
        "nombre": "Frappé Choco roll",
        "precio": 80,
        "descripcion": "Frappé sabor choco roll.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-choco-torro",
        "nombre": "Frappé Choco torro",
        "precio": 80,
        "descripcion": "Frappé sabor choco torro.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-taro",
        "nombre": "Frappé Taro",
        "precio": 90,
        "descripcion": "Frappé sabor taro.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-nutella",
        "nombre": "Frappé Nutella",
        "precio": 90,
        "descripcion": "Frappé sabor nutella.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-mazapan",
        "nombre": "Frappé Mazapán",
        "precio": 90,
        "descripcion": "Frappé sabor mazapán.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-lotus",
        "nombre": "Frappé Lotus",
        "precio": 90,
        "descripcion": "Frappé sabor lotus.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "frappe-lotus-con-carga-de-cafe",
        "nombre": "Frappé Lotus con carga de café",
        "precio": 95,
        "descripcion": "Frappé sabor lotus con carga de café.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      }
    ],
    "Malteadas": [
      {
        "id": "malteada-de-vainilla",
        "nombre": "Malteada de vainilla",
        "precio": 90,
        "descripcion": "Malteada sabor vainilla.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "malteada-de-chocolate",
        "nombre": "Malteada de chocolate",
        "precio": 90,
        "descripcion": "Malteada sabor chocolate.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      },
      {
        "id": "malteada-de-fresa",
        "nombre": "Malteada de fresa",
        "precio": 90,
        "descripcion": "Malteada sabor fresa.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "leche-deslactosada",
                "nombre": "Leche deslactosada",
                "precioExtra": 10
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 8
        }
      }
    ]
  },
  "Alimentos": {
    "Pastas": [
      {
        "id": "fetuccini-alfredo",
        "nombre": "Fetuccini Alfredo",
        "precio": 170,
        "descripcion": "Acompañado de tiras tender y pan.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tiras-tender",
                "nombre": "Tiras tender",
                "precioExtra": 45
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "fetuccini-chipotle",
        "nombre": "Fetuccini chipotle",
        "precio": 180,
        "descripcion": "Acompañado de tiras tender y pan.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tiras-tender",
                "nombre": "Tiras tender",
                "precioExtra": 45
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "fetuccini-champinones",
        "nombre": "Fetuccini champiñones",
        "precio": 190,
        "descripcion": "Acompañado de tiras tender y pan.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tiras-tender",
                "nombre": "Tiras tender",
                "precioExtra": 45
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      }
    ],
    "Hot cakes": [
      {
        "id": "hot-cakes-clasicos",
        "nombre": "Hot cakes clásicos",
        "precio": 110,
        "descripcion": "3 hot cakes, miel, mantequilla y mermelada.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "hot-cakes-amor",
        "nombre": "Hot cakes Amor",
        "precio": 135,
        "descripcion": "3 hot cakes, miel, mantequilla, mermelada, fresa y plátano.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "hot-cakes-mananeros",
        "nombre": "Hot cakes mañaneros",
        "precio": 155,
        "descripcion": "3 hot cakes, miel, mantequilla, mermelada, huevo estrellado y tocino.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      }
    ],
    "Toast": [
      {
        "id": "avocado-amor",
        "nombre": "Avocado Amor",
        "precio": 155,
        "descripcion": "2 piezas de pan de masa madre gratinadas con queso, aguacate, ensalada de verduras y tomates salteados.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "avocado-toast",
        "nombre": "Avocado toast",
        "precio": 155,
        "descripcion": "2 piezas de pan tostado, guacamole, huevos revueltos con queso y ensalada.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      }
    ],
    "Sándwiches": [
      {
        "id": "sandwich-amor-y-amor",
        "nombre": "Sándwich Amor y Amor",
        "precio": 135,
        "descripcion": "Pan Oroweat, jamón, queso, huevo estrellado, tocino, lechuga, tomate, aguacate y cebolla.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "sandwich-club",
        "nombre": "Sándwich club",
        "precio": 160,
        "descripcion": "Jamón, queso, huevo estrellado, pechuga de pollo, lechuga, tomate, aguacate, cebolla y papas a la francesa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "champ-wich",
        "nombre": "Champ-wich",
        "precio": 160,
        "descripcion": "Tiras tender, queso gratinado con champiñones y especias, acompañado de papas a la francesa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "croque-madame",
        "nombre": "Croque madame",
        "precio": 170,
        "descripcion": "Sándwich francés, jamón, queso gratinado, salsa bechamel y huevo, acompañado de ensalada.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      }
    ],
    "Croissants": [
      {
        "id": "croissant-amor",
        "nombre": "Croissant Amor",
        "precio": 145,
        "descripcion": "Jamón, queso, tocino, lechuga, tomate, aguacate, cebolla, aderezo de mostaza y papas a la francesa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "croissant-primavera",
        "nombre": "Croissant primavera",
        "precio": 155,
        "descripcion": "Jamón, queso, champiñones con pimiento, lechuga, tomate, aguacate, cebolla, aderezo de mostaza y papas a la francesa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      },
      {
        "id": "croisupremo",
        "nombre": "Croisupremo",
        "precio": 160,
        "descripcion": "Jamón, queso, huevo estrellado y crema bechamel, acompañado de ensalada de verduras.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 4
        }
      }
    ],
    "Huevos y omelettes": [
      {
        "id": "huevos-rancheros",
        "nombre": "Huevos rancheros",
        "precio": 140,
        "descripcion": "2 huevos estrellados sobre tortillas de maíz, salsa roja, frijoles refritos, tostadas, aguacate y pan.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "huevos-divorciados",
        "nombre": "Huevos divorciados",
        "precio": 155,
        "descripcion": "2 huevos estrellados sobre tortillas de maíz, salsas roja y verde, frijoles refritos, tostadas, pan y aguacate.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "omelette",
        "nombre": "Omelette",
        "precio": 160,
        "descripcion": "Torta de huevo con espinaca, queso gratinado, champiñones y jamón, con guacamole, frijoles refritos, tostadas y pan.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "omelette-nutritivo",
        "nombre": "Omelette nutritivo",
        "precio": 160,
        "descripcion": "Torta de huevo con espinaca, queso gratinado, champiñones y jamón, con aguacate, ensalada de verduras y aderezos.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "motulenos",
        "nombre": "Motuleños",
        "precio": 170,
        "descripcion": "Huevos estrellados sobre tostadas, salsa, frijoles refritos, tostadas, queso fresco, pan y aguacate.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      }
    ],
    "Chilaquiles": [
      {
        "id": "chilaquiles-con-pollo-o-huevo",
        "nombre": "Chilaquiles con pollo o huevo",
        "precio": 160,
        "descripcion": "Tostadas caseras, media crema, queso fresco, cebolla, rábano, cilantro y aguacate. Salsa y proteína a elegir.",
        "opciones": [
          {
            "id": "salsa",
            "nombre": "Salsa",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "roja",
                "nombre": "Roja",
                "precioExtra": 0
              },
              {
                "id": "verde",
                "nombre": "Verde",
                "precioExtra": 0
              }
            ]
          },
          {
            "id": "proteina",
            "nombre": "Proteína",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 0
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 0
              }
            ]
          },
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "chilaquiles-amor",
        "nombre": "Chilaquiles Amor",
        "precio": 175,
        "descripcion": "Tostadas caseras, media crema, queso fresco, cebolla, rábano, cilantro y aguacate. Salsa a elegir y pechuga de pollo desmenuzada.",
        "opciones": [
          {
            "id": "salsa",
            "nombre": "Salsa",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "roja",
                "nombre": "Roja",
                "precioExtra": 0
              },
              {
                "id": "verde",
                "nombre": "Verde",
                "precioExtra": 0
              }
            ]
          },
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "chilaquiles-crema-xcatic",
        "nombre": "Chilaquiles crema xcatic",
        "precio": 190,
        "descripcion": "Tostadas caseras con crema de chile xcatic, media crema, queso gratinado, pollo, cebolla, rábano, cilantro y aguacate.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "chilaquiles-rajas-poblanas",
        "nombre": "Chilaquiles rajas poblanas",
        "precio": 190,
        "descripcion": "Tostadas caseras con salsa roja o verde y crema de rajas poblanas: cebolla, pollo, rajas y elote.",
        "opciones": [
          {
            "id": "salsa",
            "nombre": "Salsa",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "roja",
                "nombre": "Roja",
                "precioExtra": 0
              },
              {
                "id": "verde",
                "nombre": "Verde",
                "precioExtra": 0
              }
            ]
          },
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      },
      {
        "id": "chilaquiles-divorciados",
        "nombre": "Chilaquiles divorciados",
        "precio": 185,
        "descripcion": "Tostadas caseras, media crema, queso fresco, cebolla, rábano, cilantro y aguacate. Salsas roja y verde, pollo desmenuzado y huevo estrellado.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "pollo",
                "nombre": "Pollo",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 5
        }
      }
    ],
    "Enchiladas suizas": [
      {
        "id": "enchiladas-suizas-rojas-o-verdes",
        "nombre": "Enchiladas suizas rojas o verdes",
        "precio": 165,
        "descripcion": "3 tortillas rellenas de pollo, salsa a elegir, queso gratinado, media crema, cebolla, cilantro, queso fresco, frijoles refritos, tostadas y aguacate.",
        "opciones": [
          {
            "id": "salsa",
            "nombre": "Salsa",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "roja",
                "nombre": "Roja",
                "precioExtra": 0
              },
              {
                "id": "verde",
                "nombre": "Verde",
                "precioExtra": 0
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        },
        "notaFuente": "El título ofrece roja o verde; la descripción impresa menciona solo verde. Se conserva la elección del título."
      },
      {
        "id": "enchiladas-suizas-xcatic",
        "nombre": "Enchiladas suizas xcatic",
        "precio": 185,
        "descripcion": "3 tortillas rellenas de pollo, salsa xcatic, queso gratinado, media crema, cebolla, queso fresco, frijoles refritos, tostadas y aguacate.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 6
        }
      }
    ],
    "Waffles": [
      {
        "id": "waffle-clasico",
        "nombre": "Waffle clásico",
        "precio": 125,
        "descripcion": "Azúcar glas, untable a elegir, crema batida y helado.",
        "opciones": [
          {
            "id": "untable",
            "nombre": "Untable",
            "tipo": "texto",
            "requerido": true,
            "longitudMaxima": 60,
            "ayuda": "El menú no enumera los untables. Confirma la disponibilidad con cocina y escribe la elección."
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "waffle-churro",
        "nombre": "Waffle churro",
        "precio": 135,
        "descripcion": "Azúcar y canela, acompañado de Nutella, lechera y helado.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "marque-waffle",
        "nombre": "Marque waffle",
        "precio": 145,
        "descripcion": "Nutella y queso de bola, acompañado de helado.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "waffle-frutal",
        "nombre": "Waffle frutal",
        "precio": 155,
        "descripcion": "Azúcar glas, fresas, plátano, kiwi, arándanos, crema batida, helado y miel.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      },
      {
        "id": "waffle-salado",
        "nombre": "Waffle salado",
        "precio": 180,
        "descripcion": "Jamón, queso, huevo estrellado, tomate, aguacate y cebolla, con ensalada de verduras y vinagreta de la casa.",
        "opciones": [],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 3
        }
      }
    ]
  },
  "Postres": {},
  "Paquetes": {
    "Desayunos del día": [
      {
        "id": "desayuno-clasico",
        "nombre": "Desayuno clásico",
        "precio": 170,
        "descripcion": "Pan tostado, huevo con jamón, frijoles refritos, café, pan con mantequilla y agua del día.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "frijol",
                "nombre": "Frijol",
                "precioExtra": 35
              },
              {
                "id": "jamon",
                "nombre": "Jamón",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "desayuno-tempranero",
        "nombre": "Desayuno tempranero",
        "precio": 170,
        "descripcion": "3 mini hot cakes, huevo revuelto, tocino, pan y agua del día.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "frijol",
                "nombre": "Frijol",
                "precioExtra": 35
              },
              {
                "id": "jamon",
                "nombre": "Jamón",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "tempranero-amor",
        "nombre": "Tempranero Amor",
        "precio": 195,
        "descripcion": "Chilaquiles, 3 mini hot cakes, huevo revuelto, tocino, pan y agua del día.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "frijol",
                "nombre": "Frijol",
                "precioExtra": 35
              },
              {
                "id": "jamon",
                "nombre": "Jamón",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "tempranero-mexicano",
        "nombre": "Tempranero mexicano",
        "precio": 205,
        "descripcion": "Chilaquiles, huevo a la mexicana, frijoles refritos, pan, agua del día y fruta o café.",
        "opciones": [
          {
            "id": "acompanamiento",
            "nombre": "Acompañamiento incluido",
            "tipo": "unica",
            "requerido": true,
            "valores": [
              {
                "id": "fruta",
                "nombre": "Fruta",
                "precioExtra": 0
              },
              {
                "id": "cafe",
                "nombre": "Café",
                "precioExtra": 0
              }
            ]
          },
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "frijol",
                "nombre": "Frijol",
                "precioExtra": 35
              },
              {
                "id": "jamon",
                "nombre": "Jamón",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      },
      {
        "id": "burrito",
        "nombre": "Burrito",
        "precio": 205,
        "descripcion": "Tortillón, frijoles refritos, queso manchego, lechuga, tomate, cebolla, guacamole, pollo tender, papas a la francesa, café y agua del día.",
        "opciones": [
          {
            "id": "extras",
            "nombre": "Extras",
            "tipo": "multiple",
            "requerido": false,
            "valores": [
              {
                "id": "tocino",
                "nombre": "Tocino",
                "precioExtra": 35
              },
              {
                "id": "huevo",
                "nombre": "Huevo",
                "precioExtra": 35
              },
              {
                "id": "frijol",
                "nombre": "Frijol",
                "precioExtra": 35
              },
              {
                "id": "jamon",
                "nombre": "Jamón",
                "precioExtra": 35
              }
            ]
          }
        ],
        "fuente": {
          "archivo": "assets/Menu Amor & Amor.pdf",
          "pagina": 2
        }
      }
    ]
  }
};
globalThis.menuDB = menuDB;
