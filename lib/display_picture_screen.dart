import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

class DisplayPictureScreen extends StatefulWidget {
  final String imagePath;

  const DisplayPictureScreen({Key? key, required this.imagePath})
      : super(key: key);

  @override
  State<DisplayPictureScreen> createState() => _DisplayPictureScreenState();
}

class _DisplayPictureScreenState extends State<DisplayPictureScreen> {
  Color? _dominantColor;

  @override
  void initState() {
    super.initState();
    _getDominantColor();
  }

  Future<void> _getDominantColor() async {
    final image = img.decodeImage(await File(widget.imagePath).readAsBytes());
    if (image != null) {
      final pixel = image.getPixel(image.width ~/ 2, image.height ~/ 2);
      setState(() {
        _dominantColor = Color.fromARGB(
            pixel.a.toInt(), pixel.r.toInt(), pixel.g.toInt(), pixel.b.toInt());
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Display the Picture')),
      body: Column(
        children: [
          Image.file(File(widget.imagePath)),
          const SizedBox(height: 20),
          if (_dominantColor != null)
            Container(
              width: 100,
              height: 100,
              color: _dominantColor,
              child: Center(
                child: Text(
                  '#${_dominantColor!.value.toRadixString(16)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
