#!/usr/bin/env python3
# Пересобирает APK после apktool: resources.arsc -> STORE + выравнивание 4 байта.
# Без этого Android 11+ отказывается ставить пакет ("Не удалось установить пакет").
import zipfile, struct, zlib, sys, os

SRC, DST = sys.argv[1], sys.argv[2]

def raw_deflate(data):
    co = zlib.compressobj(9, zlib.DEFLATED, -15)
    return co.compress(data) + co.flush()

zin = zipfile.ZipFile(SRC)
entries = []
for info in zin.infolist():
    data = zin.read(info.filename)
    if info.filename == 'resources.arsc':
        method, payload = 0, data
    else:
        method, payload = 8, raw_deflate(data)
    entries.append(dict(name=info.filename, payload=payload, method=method,
                        crc=zlib.crc32(data) & 0xffffffff, usize=len(data)))

DOS_TIME, DOS_DATE = 0x7A51, 0x5D7A
def build_local(name_b, method, crc, csize, usize, extra):
    return struct.pack('<I5H3I2H', 0x04034b50, 20, 0x0800, method,
                       DOS_TIME, DOS_DATE, crc, csize, usize,
                       len(name_b), len(extra)) + name_b + extra
def build_central(name_b, method, crc, csize, usize, lho):
    return struct.pack('<I6H3I5H2I', 0x02014b50, 20, 20, 0x0800, method,
                       DOS_TIME, DOS_DATE, crc, csize, usize,
                       len(name_b), 0, 0, 0, 0, 0, lho) + name_b

out = bytearray()
central = []
pos = 0
for e in entries:
    name_b = e['name'].encode('utf-8')
    base = pos + 30 + len(name_b)
    if e['method'] == 0:
        mism = base % 4
        extra = b'' if mism == 0 else struct.pack('<HH', 0x1234, 4 - mism) + b'\x00' * (4 - mism)
    else:
        extra = b''
    out += build_local(name_b, e['method'], e['crc'], len(e['payload']), e['usize'], extra)
    out += e['payload']
    central.append(build_central(name_b, e['method'], e['crc'], len(e['payload']), e['usize'], pos))
    pos = len(out)
cd_off = pos
cd_blob = b''.join(central)
out += cd_blob
out += struct.pack('<I4H2IH', 0x06054b50, 0, 0, len(entries), len(entries), len(cd_blob), cd_off, 0)
open(DST, 'wb').write(out)
print('align_arsc: wrote', DST, os.path.getsize(DST), 'bytes')
