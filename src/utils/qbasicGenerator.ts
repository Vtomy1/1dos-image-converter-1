import { PlanarData } from '../types/dos';

/**
 * Creates standard 7-byte QuickBASIC BSAVE binary file.
 *
 * Header Format:
 * Byte 0: &HFD (253) - BSAVE signature
 * Bytes 1-2: Segment address (&HA000 -> 0x00, 0xA0)
 * Bytes 3-4: Offset address (&H0000 -> 0x00, 0x00)
 * Bytes 5-6: Data length in bytes (38,400 -> 0x00, 0x96)
 * Bytes 7..: Raw binary data
 */
export function createBsaveFile(
  planeData: Uint8Array,
  segment: number = 0xa000,
  offset: number = 0x0000
): Uint8Array {
  const length = planeData.length;
  const header = new Uint8Array(7);

  header[0] = 0xfd; // Magic signature
  header[1] = segment & 0xff;
  header[2] = (segment >> 8) & 0xff;
  header[3] = offset & 0xff;
  header[4] = (offset >> 8) & 0xff;
  header[5] = length & 0xff;
  header[6] = (length >> 8) & 0xff;

  const bsaveFile = new Uint8Array(7 + length);
  bsaveFile.set(header, 0);
  bsaveFile.set(planeData, 7);

  return bsaveFile;
}

/**
 * Generates QBasic / QuickBASIC 4.5 4-Plane BSAVE Loader Code Sample.
 */
export function generateQBasicLoaderCode(baseName: string = 'IMAGE'): string {
  return `' ==============================================================================
' QBASIC / QUICKBASIC 4.5 - EGA/VGA 4-BIT 640x480 (SCREEN 12) 4-PLANE LOADER
' ==============================================================================
' This program loads an authentic 4-bit 16-color 640x480 planar graphic created
' with the RetroDOS Dithering Studio into EGA/VGA Video Memory (&HA000).
'
' HOW IT WORKS:
' In SCREEN 12, each pixel has 16 colors (4 bits: Blue, Green, Red, Intensity).
' The VGA card separates video memory into 4 parallel bitplanes:
'   - Plane 0: Bit 0 (Blue)       -> ${baseName}0.BSV (38,400 bytes)
'   - Plane 1: Bit 1 (Green)      -> ${baseName}1.BSV (38,400 bytes)
'   - Plane 2: Bit 2 (Red)        -> ${baseName}2.BSV (38,400 bytes)
'   - Plane 3: Bit 3 (Intensity)  -> ${baseName}3.BSV (38,400 bytes)
'
' To write to a specific plane, we program the EGA/VGA Sequencer Map Mask
' Register at I/O Port &H3C4 / &H3C5 before each BLOAD!
' ==============================================================================

DEFINT A-Z
CLS

' 1. Switch to VGA 640x480 16-Color Graphics Mode
SCREEN 12

' 2. Point default memory segment to VGA Video Display Buffer
DEF SEG = &HA000

' 3. Load each of the 4 bitplanes sequentially
PRINT "Loading 4-Bit 640x480 Planar Image..."

FOR Plane% = 0 TO 3
    ' Select Sequencer Map Mask Register (Index 2 at Port &H3C4)
    OUT &H3C4, 2

    ' Enable write access ONLY for the active bitplane (Port &H3C5)
    ' Plane 0 (Blue):      Mask = 2^0 = 1 (0001b)
    ' Plane 1 (Green):     Mask = 2^1 = 2 (0010b)
    ' Plane 2 (Red):       Mask = 2^2 = 4 (0100b)
    ' Plane 3 (Intensity): Mask = 2^3 = 8 (1000b)
    OUT &H3C5, 2 ^ Plane%

    ' BLOAD reads the 38,400 bytes directly into offset 0 of the active plane
    FileName$ = "${baseName}" + LTRIM$(STR$(Plane%)) + ".BSV"
    BLOAD FileName$, 0
NEXT Plane%

' 4. Reset Sequencer to write to all 4 planes simultaneously (Normal default)
OUT &H3C4, 2
OUT &H3C5, &H0F

' 5. Reset segment back to BASIC default
DEF SEG

' 6. Wait for user to press any key
DO WHILE INKEY$ = "": LOOP

' 7. Cleanly restore text mode and exit
SCREEN 0
WIDTH 80
CLS
PRINT "Image display completed. Back to DOS / QBasic."
END
`;
}

/**
 * Generates QBasic / QuickBASIC 4.5 4-Plane BSAVE Saver Code Sample.
 */
export function generateQBasicSaverCode(baseName: string = 'SAVED'): string {
  return `' ==============================================================================
' QBASIC / QUICKBASIC 4.5 - EGA/VGA 4-BIT (SCREEN 12) 4-PLANE BSAVE SAVER
' ==============================================================================
' This utility demonstrates how to SAVE the active 640x480 16-color screen
' into 4 separate bitplane .BSV files using the EGA/VGA Graphics Controller!
'
' CRITICAL HARDWARE NOTE:
' - Writing (BLOAD) uses the SEQUENCER Map Mask (Port &H3C4, Index 2).
' - Reading (BSAVE) uses the GRAPHICS CONTROLLER Read Map Select (Port &H3CE, Index 4).
' ==============================================================================

DEFINT A-Z

' 1. Switch to 640x480 16-Color Mode
SCREEN 12

' (Optional demo: Draw some test art on screen if not already present)
FOR r% = 20 TO 220 STEP 10
    CIRCLE (320, 240), r%, (r% \ 10) MOD 16
NEXT r%
LINE (0, 0)-(639, 479), 14, B
LOCATE 2, 3: PRINT "Saving Active SCREEN 12 to 4 Bitplane .BSV files..."

' 2. Point to VGA Memory Segment
DEF SEG = &HA000

' 3. Save each plane individually
FOR Plane% = 0 TO 3
    ' Select Graphics Controller Read Map Select Register (Index 4 at Port &H3CE)
    OUT &H3CE, 4

    ' Specify which bitplane CPU reads from at &HA000:0000 (Port &H3CF)
    ' Values: 0 = Blue, 1 = Green, 2 = Red, 3 = Intensity
    OUT &H3CF, Plane%

    ' Save exactly 38,400 bytes (640 * 480 / 8)
    FileName$ = "${baseName}" + LTRIM$(STR$(Plane%)) + ".BSV"
    BSAVE FileName$, 0, 38400
NEXT Plane%

' 4. Reset Graphics Controller to default Read Map 0
OUT &H3CE, 4
OUT &H3CF, 0

' 5. Reset segment
DEF SEG

LOCATE 4, 3: PRINT "Successfully saved all 4 planes! Press any key..."
DO WHILE INKEY$ = "": LOOP
SCREEN 0
END
`;
}

/**
 * Generates Unified Single-File Binary QBasic Loader.
 * Reads a single 153.6KB binary file and blasts it directly to the 4 bitplanes.
 */
export function generateQBasicUnifiedLoaderCode(fileName: string = 'IMAGE.BIN'): string {
  return `' ==============================================================================
' QBASIC / QUICKBASIC 4.5 - UNIFIED SINGLE-FILE 4-PLANE BINARY LOADER
' ==============================================================================
' Loads all 4 bitplanes directly from a single 153,600-byte binary file
' without requiring 4 separate .BSV files.
' ==============================================================================

DEFINT A-Z
SCREEN 12
DEF SEG = &HA000

PRINT "Loading unified planar file: ${fileName}..."

DIM Buffer AS STRING * 4800  ' 4.8 KB buffer chunk
FileNum% = FREEFILE
OPEN "${fileName}" FOR BINARY AS #FileNum%

FOR Plane% = 0 TO 3
    ' Set Sequencer Map Mask to active plane
    OUT &H3C4, 2
    OUT &H3C5, 2 ^ Plane%

    ' 38,400 bytes = 8 chunks of 4,800 bytes
    FOR Chunk% = 0 TO 7
        GET #FileNum%, , Buffer
        DestOffset& = Chunk% * 4800&

        ' Fast memory block transfer from string buffer to VRAM
        ' In QuickBASIC, POKE or ASM block move:
        FOR i% = 1 TO 4800
            POKE DestOffset& + (i% - 1), ASC(MID$(Buffer, i%, 1))
        NEXT i%
    NEXT Chunk%
NEXT Plane%

CLOSE #FileNum%

' Reset hardware mask to write to all planes
OUT &H3C4, 2
OUT &H3C5, &H0F
DEF SEG

DO WHILE INKEY$ = "": LOOP
SCREEN 0
END
`;
}

/**
 * Generates compact inline DATA statements loader for QBasic (for previews)
 */
export function generateQBasicInlineSampleCode(): string {
  return `' ==============================================================================
' QBASIC 4-PLANE REGISTER REFERENCE TESTER
' Quick hardware test to verify EGA/VGA Sequencer & Graphics Controller registers
' ==============================================================================
DEFINT A-Z
SCREEN 12
CLS

PRINT "EGA/VGA 4-Plane Bitplane Architecture:"
PRINT "--------------------------------------------------------"
PRINT "Plane 0 (Port &H3C5 = 1): Blue Component"
PRINT "Plane 1 (Port &H3C5 = 2): Green Component"
PRINT "Plane 2 (Port &H3C5 = 4): Red Component"
PRINT "Plane 3 (Port &H3C5 = 8): Brightness/Intensity Component"
PRINT "--------------------------------------------------------"
PRINT "Press any key to test direct Sequencer Plane POKE..."
DO WHILE INKEY$ = "": LOOP

DEF SEG = &HA000

' Draw red stripe (Plane 2) directly via hardware port:
OUT &H3C4, 2: OUT &H3C5, 4
FOR i& = 0 TO 80 * 100: POKE i&, &HFF: NEXT i&

' Draw green stripe (Plane 1):
OUT &H3C4, 2: OUT &H3C5, 2
FOR i& = 80 * 100 TO 80 * 200: POKE i&, &HFF: NEXT i&

' Draw blue stripe (Plane 0):
OUT &H3C4, 2: OUT &H3C5, 1
FOR i& = 80 * 200 TO 80 * 300: POKE i&, &HFF: NEXT i&

' Reset Sequencer:
OUT &H3C4, 2: OUT &H3C5, &H0F
DEF SEG

PRINT "Hardware bitplanes successfully demonstrated!"
DO WHILE INKEY$ = "": LOOP
SCREEN 0
END
`;
}
