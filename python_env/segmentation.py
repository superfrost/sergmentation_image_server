import sys
import numpy as np
from PIL import Image

work_dir = './public/images/'
fileName = sys.argv[1]
sizeOfSegment = sys.argv[2]
insertedImageId = sys.argv[3]
flagCreateThumbnail = sys.argv[4]

# Create thumbnail for image
if (flagCreateThumbnail):
  dirForThumbnails = work_dir + "mini/"
  thumbImg = Image.open(work_dir + fileName)
  thumbImg.thumbnail((300, 300))
  thumbImg.save(dirForThumbnails + fileName, quality=70, subsampling=0)

# Segmentation script
img = Image.open(work_dir + fileName)
gray_img = img.convert("L")
np_array = np.array(gray_img, dtype='uint8')

def segmentation(npArray, segmentSize = 8):
  widthArr = npArray.shape[0]
  heightArr = npArray.shape[1]
  
  widthSteps = widthArr // segmentSize
  heightSteps = heightArr // segmentSize

  newArr = np.zeros((widthSteps * segmentSize, heightSteps * segmentSize))
  
  for i in range(widthSteps):
    for j in range(heightSteps):
      segment = npArray[i*segmentSize : i*segmentSize+segmentSize, j*segmentSize : j*segmentSize+segmentSize]
      meanOfSegment = np.mean(segment)
      normSegment = segment - meanOfSegment
      poweredSegment = normSegment ** 2
      filteredSegment = (poweredSegment > 0) * poweredSegment
      newArr[i*segmentSize : i*segmentSize+segmentSize, j*segmentSize : j*segmentSize+segmentSize] = filteredSegment

  newArr = newArr - np.mean(newArr)
  newArr = (newArr > 0) * 255
  # newArr = newArr // np.mean(newArr)
  # newArr = (newArr > 0) * 255

  return newArr

segmentedImg = segmentation(np_array, int(sizeOfSegment))

img_from_npArray = Image.fromarray(segmentedImg.astype('uint8'), 'L')

resultFileName = 'result-' + insertedImageId + '-' + sizeOfSegment + '.jpg'
save_dir = work_dir + "result/" + resultFileName
img_from_npArray.save(save_dir, quality=95, subsampling=0)

# Thumbnail for result image after segmentation
img_from_npArray.thumbnail((300,300))
img_from_npArray.save(dirForThumbnails + "result/" + resultFileName, quality=70, subsampling=0)


# print(resultFileName)
sys.stdout.write(resultFileName)
