#!/usr/bin/env python3
import base64
import struct

def create_simple_png(width, height, color_rgb):
    """创建一个简单的PNG图像"""
    
    def write_png_chunk(chunk_type, data):
        chunk_data = chunk_type + data
        crc = 0xFFFFFFFF
        for byte in chunk_data:
            crc ^= byte
            for _ in range(8):
                if crc & 1:
                    crc = (crc >> 1) ^ 0xEDB88320
                else:
                    crc >>= 1
        crc ^= 0xFFFFFFFF
        return struct.pack('>I', len(data)) + chunk_data + struct.pack('>I', crc)
    
    # PNG signature
    png_data = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png_data += write_png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    # 创建简单的渐变效果
    image_data = b''
    for y in range(height):
        image_data += b'\x00'  # Filter type
        for x in range(width):
            # 创建从蓝色到紫色的渐变
            ratio = x / width if width > 1 else 0
            r = int(102 + (118 - 102) * ratio)  # 102 -> 118
            g = int(126 + (75 - 126) * ratio)   # 126 -> 75  
            b = int(234 + (162 - 234) * ratio)  # 234 -> 162
            
            # 如果在中心区域，绘制白色的"字"
            center_x, center_y = width // 2, height // 2
            char_size = min(width, height) // 3
            
            if (abs(x - center_x) < char_size // 2 and 
                abs(y - center_y) < char_size // 2):
                # 简化的"字"字形状
                if (y == center_y or  # 横线
                    (x == center_x and y >= center_y - char_size//3) or  # 竖线
                    (abs(x - center_x) < char_size//4 and y == center_y + char_size//3)):  # 下横线
                    r, g, b = 255, 255, 255  # 白色
            
            image_data += bytes([r, g, b])
    
    # 压缩数据 (简单的无压缩格式)
    import zlib
    compressed_data = zlib.compress(image_data)
    png_data += write_png_chunk(b'IDAT', compressed_data)
    
    # IEND chunk
    png_data += write_png_chunk(b'IEND', b'')
    
    return png_data

# 创建不同尺寸的图标
sizes = [16, 32, 48, 128]

for size in sizes:
    png_data = create_simple_png(size, size, (102, 126, 234))
    
    with open(f'icon{size}.png', 'wb') as f:
        f.write(png_data)
    
    print(f'Created icon{size}.png ({size}x{size})')

print('All PNG icons created successfully!')
