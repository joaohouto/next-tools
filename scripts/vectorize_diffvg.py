# scripts/vectorize_diffvg.py
"""
Script Python para vetorização usando DiffVG
Requer: pip install diffvg torch torchvision pillow svgwrite numpy
"""

import sys
import json
import torch
import diffvg
import numpy as np
from PIL import Image
import svgwrite

def load_image(image_path, target_size=256):
    """Carrega e preprocessa a imagem"""
    img = Image.open(image_path).convert('RGB')

    # Redimensiona mantendo aspect ratio
    img.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)

    # Converte para tensor
    img_tensor = torch.from_numpy(np.array(img)).float() / 255.0
    img_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)

    return img_tensor, img.size

def vectorize_with_diffvg(image_path, output_path, num_paths=128, num_iter=500):
    """
    Vetoriza imagem usando DiffVG

    Args:
        image_path: Caminho da imagem de entrada
        output_path: Caminho do SVG de saída
        num_paths: Número de paths (mais = mais detalhes)
        num_iter: Iterações de otimização (mais = melhor qualidade)
    """

    # Carrega imagem
    target_img, img_size = load_image(image_path)
    canvas_width, canvas_height = img_size

    # Inicializa shapes aleatórias
    shapes = []
    shape_groups = []

    for i in range(num_paths):
        # Gera pontos aleatórios para cada path
        num_control_points = torch.tensor([2])
        points = torch.rand(4, 2) * torch.tensor([canvas_width, canvas_height])
        points.requires_grad = True

        path = diffvg.Path(
            num_control_points=num_control_points,
            points=points,
            is_closed=False
        )

        shapes.append(path)

        # Cor aleatória
        fill_color = torch.rand(4)
        fill_color[3] = 0.5  # Alpha
        fill_color.requires_grad = True

        shape_groups.append(diffvg.ShapeGroup(
            shape_ids=torch.tensor([i]),
            fill_color=fill_color,
            stroke_color=None
        ))

    # Otimização
    points_vars = []
    color_vars = []

    for path in shapes:
        path.points.requires_grad = True
        points_vars.append(path.points)

    for group in shape_groups:
        group.fill_color.requires_grad = True
        color_vars.append(group.fill_color)

    optimizer = torch.optim.Adam(points_vars + color_vars, lr=0.1)

    # Renderiza e otimiza
    render = diffvg.RenderFunction.apply

    for t in range(num_iter):
        optimizer.zero_grad()

        # Renderiza SVG atual
        scene_args = diffvg.RenderFunction.serialize_scene(
            canvas_width, canvas_height, shapes, shape_groups
        )
        img = render(canvas_width, canvas_height, 2, 2, t, None, *scene_args)

        # Loss: diferença com imagem original
        loss = torch.nn.functional.mse_loss(img, target_img)

        # Backprop
        loss.backward()
        optimizer.step()

        # Clamp colors para [0, 1]
        for group in shape_groups:
            group.fill_color.data.clamp_(0.0, 1.0)

        if t % 100 == 0:
            print(f"Iteration {t}/{num_iter}, Loss: {loss.item():.4f}")

    # Salva SVG
    diffvg.save_svg(
        output_path,
        canvas_width,
        canvas_height,
        shapes,
        shape_groups
    )

    return output_path

def main():
    """Função principal para CLI"""
    if len(sys.argv) < 3:
        print("Uso: python vectorize_diffvg.py <input_image> <output_svg> [num_paths] [num_iter]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    num_paths = int(sys.argv[3]) if len(sys.argv) > 3 else 128
    num_iter = int(sys.argv[4]) if len(sys.argv) > 4 else 500

    try:
        result = vectorize_with_diffvg(input_path, output_path, num_paths, num_iter)
        print(json.dumps({"success": True, "output": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()