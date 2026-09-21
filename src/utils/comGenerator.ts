import { PlanarData } from '../types/dos';

/**
 * Generates standalone MS-DOS .COM executable binary (x86 Real Mode).
 * Sets VGA Mode 12h (640x480 16-color 4-plane), configures Sequencer Map Mask,
 * decompresses planar image to A000:0000, waits for keypress, restores text mode 03h,
 * and exits cleanly to DOS.
 */
export function generateDosComBinary(planar: PlanarData): Uint8Array {
  // Machine code for MS-DOS .COM loader (8086 compatible)
  const headerCode: number[] = [
    // ORG 100h
    // 1. Set Video Mode 12h (640x480, 16-color, 4 bitplanes)
    0xb8, 0x12, 0x00,       // mov ax, 0012h
    0xcd, 0x10,             // int 10h

    // 2. Set ES = 0A000h (VGA Graphic Segment)
    0xb8, 0x00, 0xa0,       // mov ax, 0A000h
    0x8e, 0xc0,             // mov es, ax

    // 3. Point SI to embedded image data at end of code stub
    // The placeholder address will be calculated dynamically below:
    0xbe, 0x00, 0x00,       // mov si, offset image_data (bytes 11, 12 filled later)

    // 4. Initialize plane loop: BP = plane (0..3)
    0x31, 0xed,             // xor bp, bp

    // === plane_loop (offset 15) ===
    // Select Sequencer Map Mask Register (Port 3C4h, index 2)
    0xba, 0xc4, 0x03,       // mov dx, 03C4h
    0xb0, 0x02,             // mov al, 02h
    0xee,                   // out dx, al

    // Set Map Mask for current plane: (1 << BP) to Port 3C5h
    0x42,                   // inc dx (dx = 03C5h)
    0xb0, 0x01,             // mov al, 01h
    0x89, 0xe9,             // mov cx, bp
    0xd2, 0xe0,             // shl al, cl
    0xee,                   // out dx, al

    // Read 2-byte plane length from SI
    0xad,                   // lodsw
    0x31, 0xff,             // xor di, di (destination ES:DI = A000:0000)

    // === decomp_loop (offset 28) ===
    0xac,                   // lodsb (read tag byte)
    0xa8, 0x80,             // test al, 80h
    0x75, 0x0a,             // jnz run_seq (jump to offset +10)

    // Literal run: count = al + 1
    0x88, 0xc1,             // mov cl, al
    0x31, 0xed,             // xor ch, ch
    0x41,                   // inc cx
    0xf3, 0xa4,             // rep movsb
    0xeb, 0x0d,             // jmp check_end

    // === run_seq (offset 43) ===
    0x24, 0x7f,             // and al, 7Fh
    0x04, 0x02,             // add al, 02h
    0x88, 0xc1,             // mov cl, al
    0x31, 0xed,             // xor ch, ch
    0xac,                   // lodsb
    0xf3, 0xaa,             // rep stosb

    // === check_end (offset 56) ===
    0x81, 0xff, 0x00, 0x96, // cmp di, 38400 (9600h)
    0x72, 0xdd,             // jb decomp_loop (relative -35)

    // Next plane
    0x45,                   // inc bp
    0x83, 0xfd, 0x04,       // cmp bp, 04h
    0x72, 0xca,             // jb plane_loop (relative -54)

    // Wait for keypress
    0x30, 0xe4,             // xor ah, ah
    0xcd, 0x16,             // int 16h

    // Restore 80x25 text mode 03h
    0xb8, 0x03, 0x00,       // mov ax, 0003h
    0xcd, 0x10,             // int 10h

    // Exit to DOS
    0xb8, 0x00, 0x4c,       // mov ax, 4C00h
    0xcd, 0x21,             // int 21h
  ];

  // Fix up SI offset in header: ORG is 100h
  const dataOffsetInCom = 0x0100 + headerCode.length;
  headerCode[9] = dataOffsetInCom & 0xff;
  headerCode[10] = (dataOffsetInCom >> 8) & 0xff;

  // Combine header and RLE data
  const totalLength = headerCode.length + planar.rleBytes.length;
  const comFile = new Uint8Array(totalLength);
  comFile.set(headerCode, 0);
  comFile.set(planar.rleBytes, headerCode.length);

  return comFile;
}

/**
 * Generates an MS-DOS .EXE (MZ format) multi-segment binary.
 * Unlike .COM (limited to ~64KB), an MZ .EXE supports full uncompressed 153.6KB
 * planar images without segment constraints!
 */
export function generateDosExeBinary(planar: PlanarData): Uint8Array {
  // 153,600 raw bytes: 4 planes * 38,400 bytes
  const uncompressedPlanes = new Uint8Array(153600);
  uncompressedPlanes.set(planar.plane0, 0);
  uncompressedPlanes.set(planar.plane1, 38400);
  uncompressedPlanes.set(planar.plane2, 76800);
  uncompressedPlanes.set(planar.plane3, 115200);

  // MZ Header: 32 bytes (2 paragraphs)
  const mzHeader = new Uint8Array(32);
  mzHeader[0] = 0x4d; // 'M'
  mzHeader[1] = 0x5a; // 'Z'

  // Code size: ~128 bytes code + 153,600 bytes data
  const totalImageBytes = 128 + 153600;
  const totalFileBytes = 32 + totalImageBytes;
  const num512Pages = Math.ceil(totalFileBytes / 512);
  const lastPageBytes = totalFileBytes % 512;

  // Bytes on last 512-byte page
  mzHeader[2] = lastPageBytes & 0xff;
  mzHeader[3] = (lastPageBytes >> 8) & 0xff;
  // Pages in file
  mzHeader[4] = num512Pages & 0xff;
  mzHeader[5] = (num512Pages >> 8) & 0xff;
  // Relocation items: 0
  mzHeader[6] = 0;
  mzHeader[7] = 0;
  // Header size in 16-byte paragraphs: 2 paragraphs (32 bytes)
  mzHeader[8] = 2;
  mzHeader[9] = 0;
  // Min extra paragraphs: 0x1000
  mzHeader[10] = 0x00;
  mzHeader[11] = 0x10;
  // Max extra paragraphs: 0xffff
  mzHeader[12] = 0xff;
  mzHeader[13] = 0xff;
  // Initial SS: 0
  mzHeader[14] = 0;
  mzHeader[15] = 0;
  // Initial SP: 0x0400
  mzHeader[16] = 0x00;
  mzHeader[17] = 0x04;
  // Initial IP: 0x0000
  mzHeader[20] = 0;
  mzHeader[21] = 0;
  // Initial CS: 0x0000
  mzHeader[22] = 0;
  mzHeader[23] = 0;
  // Relocation table offset: 0x001C
  mzHeader[24] = 0x1c;
  mzHeader[25] = 0x00;

  // Code segment
  const code: number[] = [
    0xb8, 0x12, 0x00,       // mov ax, 0012h
    0xcd, 0x10,             // int 10h
    0xb8, 0x00, 0xa0,       // mov ax, 0A000h
    0x8e, 0xc0,             // mov es, ax
    0x8c, 0xc8,             // mov ax, cs
    0x8e, 0xd8,             // mov ds, ax

    // Loop 4 planes uncompressed copy
    0x31, 0xed,             // xor bp, bp
    0xbe, 0x80, 0x00,       // mov si, 0080h (start of raw planar data in CS)

    // plane_loop:
    0xba, 0xc4, 0x03,       // mov dx, 03C4h
    0xb0, 0x02,             // mov al, 02h
    0xee,                   // out dx, al
    0x42,                   // inc dx
    0xb0, 0x01,             // mov al, 01h
    0x89, 0xe9,             // mov cx, bp
    0xd2, 0xe0,             // shl al, cl
    0xee,                   // out dx, al

    0x31, 0xff,             // xor di, di
    0xb9, 0x00, 0x4b,       // mov cx, 4B00h (19,200 words = 38,400 bytes)
    0xf3, 0xa5,             // rep movsw

    0x45,                   // inc bp
    0x83, 0xfd, 0x04,       // cmp bp, 04h
    0x72, 0xe2,             // jb plane_loop

    0x30, 0xe4,             // xor ah, ah
    0xcd, 0x16,             // int 16h
    0xb8, 0x03, 0x00,       // mov ax, 0003h
    0xcd, 0x10,             // int 10h
    0xb8, 0x00, 0x4c,       // mov ax, 4C00h
    0xcd, 0x21,             // int 21h
  ];

  // Pad code to exactly 128 bytes (0x80)
  const codeBlock = new Uint8Array(128);
  codeBlock.set(code, 0);

  const exeFile = new Uint8Array(32 + 128 + 153600);
  exeFile.set(mzHeader, 0);
  exeFile.set(codeBlock, 32);
  exeFile.set(uncompressedPlanes, 32 + 128);

  return exeFile;
}

/**
 * Generates NASM / TASM compatible x86 Assembly source code.
 */
export function generateAsmSource(planar: PlanarData): string {
  return `; ==============================================================================
; MS-DOS 640x480 16-Color EGA/VGA (Mode 12h) Planar Image Viewer
; Target: MS-DOS .COM Executable (Tiny Memory Model, ORG 100h)
; Compatible with: NASM, TASM, MASM, A86, DOSBox, Real MS-DOS 3.3+ / 5.0 / 6.22
;
; Assemble with NASM:
;   nasm -f bin image.asm -o image.com
; Assemble with TASM:
;   tasm /m image.asm
;   tlink /t image.obj
; ==============================================================================

[BITS 16]
[ORG 0x100]

section .text

start:
    ; 1. Set Video Mode 12h (640x480, 16 colors, 4 bitplanes)
    mov ax, 0x0012
    int 0x10

    ; 2. Set ES segment to Video Display Memory (0A000h)
    mov ax, 0xA000
    mov es, ax

    ; 3. SI points to the embedded RLE compressed planar data
    mov si, image_data

    ; 4. Loop through 4 Bitplanes (0: Blue, 1: Green, 2: Red, 3: Intensity)
    xor bp, bp              ; Plane counter (0 to 3)

plane_loop:
    ; Select EGA/VGA Sequencer Map Mask Register (Port 03C4h, Index 02h)
    mov dx, 0x03C4
    mov al, 0x02
    out dx, al

    ; Write Plane Mask to Port 03C5h: (1 << plane)
    ; Plane 0: 0001b (Blue), Plane 1: 0010b (Green),
    ; Plane 2: 0100b (Red),  Plane 3: 1000b (Intensity)
    inc dx                  ; DX = 03C5h
    mov al, 0x01
    mov cx, bp
    shl al, cl
    out dx, al

    ; Read 16-bit plane compressed byte count
    lodsw                   ; AX = compressed bytes for this plane
    xor di, di              ; ES:DI = A000:0000 (Start of VRAM for active plane)

decomp_loop:
    lodsb                   ; AL = RLE tag byte
    test al, 0x80           ; Check if MSB is set
    jnz run_sequence

    ; --- Literal Run ---
    ; Tag < 128: next (AL + 1) bytes are literal
    mov cl, al
    xor ch, ch
    inc cx
    rep movsb               ; Copy CX literal bytes from DS:SI to ES:DI
    jmp check_plane_done

run_sequence:
    ; --- Repeated Run ---
    ; Tag >= 128: repeat next byte (AL & 7Fh + 2) times
    and al, 0x7F
    add al, 0x02
    mov cl, al
    xor ch, ch
    lodsb                   ; AL = value to repeat
    rep stosb               ; Store AL into ES:DI CX times

check_plane_done:
    cmp di, 38400           ; 640 * 480 / 8 = 38,400 bytes per plane (9600h)
    jb decomp_loop          ; Loop until plane is completely filled

    inc bp                  ; Next bitplane
    cmp bp, 4
    jb plane_loop           ; Repeat for all 4 planes

wait_for_key:
    ; Wait for keystroke via BIOS interrupt
    xor ah, ah
    int 0x16

restore_text_mode:
    ; Restore standard 80x25 16-color text mode (Mode 03h)
    mov ax, 0x0003
    int 0x10

exit_to_dos:
    ; Terminate process and return control to command.com
    mov ax, 0x4C00
    int 0x21

; ==============================================================================
; Embedded Planar Image Data (RLE Compressed)
; Total Compressed Size: ${planar.rleSize.toLocaleString()} bytes
; Original Planar Size: 153,600 bytes (38,400 bytes x 4 planes)
; ==============================================================================
section .data
image_data:
${formatAsmHexDump(planar.rleBytes)}
`;
}

/**
 * Formats byte buffer as NASM db lines
 */
function formatAsmHexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  const maxBytesToOutput = Math.min(bytes.length, 1024); // Show first 1KB in preview with indicator if larger

  for (let i = 0; i < maxBytesToOutput; i += 16) {
    const chunk: string[] = [];
    const end = Math.min(i + 16, maxBytesToOutput);
    for (let k = i; k < end; k++) {
      chunk.push('0x' + bytes[k].toString(16).padStart(2, '0'));
    }
    lines.push('    db ' + chunk.join(', '));
  }

  if (bytes.length > maxBytesToOutput) {
    lines.push(
      `    ; ... [${(bytes.length - maxBytesToOutput).toLocaleString()} more compressed bytes included in binary export] ...`
    );
  }

  return lines.join('\n');
}

/**
 * Generates C/C++ Header for Borland Turbo C / Watcom C
 */
export function generateCHeader(planar: PlanarData): string {
  return `/* ==========================================================================
 * MS-DOS 640x480 16-Color Mode 12h Header
 * Compatible with Borland Turbo C/C++, DJGPP, Open Watcom
 * ========================================================================== */

#ifndef RETRO_DOS_IMAGE_H
#define RETRO_DOS_IMAGE_H

#include <dos.h>
#include <conio.h>

#define SCREEN_WIDTH      640
#define SCREEN_HEIGHT     480
#define BYTES_PER_PLANE   38400
#define TOTAL_PLANES      4

/* RLE Compressed Data Size: ${planar.rleSize} bytes */
extern const unsigned char image_rle_data[${planar.rleSize}];

/* Function prototype: Display image in Mode 12h */
void display_dos_image(void) {
    union REGS regs;
    unsigned char far *vram = (unsigned char far *)0xA0000000L;
    int plane;
    unsigned int vram_idx;
    unsigned int rle_idx = 0;

    /* Set Video Mode 12h (640x480 16-color) */
    regs.x.ax = 0x0012;
    int86(0x10, &regs, &regs);

    for (plane = 0; plane < 4; plane++) {
        unsigned int plane_len;
        
        /* Select Sequencer Map Mask Register (0x3C4 index 2) */
        outp(0x3C4, 0x02);
        outp(0x3C5, 1 << plane);

        /* Read 2-byte plane length */
        plane_len = image_rle_data[rle_idx] | (image_rle_data[rle_idx + 1] << 8);
        rle_idx += 2;

        vram_idx = 0;
        while (vram_idx < BYTES_PER_PLANE) {
            unsigned char tag = image_rle_data[rle_idx++];
            if (tag & 0x80) {
                /* Repeat count */
                int count = (tag & 0x7F) + 2;
                unsigned char val = image_rle_data[rle_idx++];
                while (count-- > 0 && vram_idx < BYTES_PER_PLANE) {
                    vram[vram_idx++] = val;
                }
            } else {
                /* Literal run */
                int count = tag + 1;
                while (count-- > 0 && vram_idx < BYTES_PER_PLANE) {
                    vram[vram_idx++] = image_rle_data[rle_idx++];
                }
            }
        }
    }

    /* Wait for keypress */
    getch();

    /* Restore text mode */
    regs.x.ax = 0x0003;
    int86(0x10, &regs, &regs);
}

#endif /* RETRO_DOS_IMAGE_H */
`;
}
