-- Raise the avatar bucket's ceiling from 2 MB to 5 MB.
--
-- The old limit was set against what the *rail* renders, which is 32 pixels,
-- and by that reasoning 2 MB was already enormous. It was the wrong thing to
-- measure. What people upload is whatever their phone took, and a photo off a
-- recent handset is routinely three or four megabytes before it has been
-- touched — so the limit was not protecting storage, it was rejecting the
-- ordinary case and asking somebody to go and resize a file by hand.
--
-- It costs nothing now in any event: the picker crops and re-encodes to a
-- square 512px WebP in the browser, so what actually lands in the bucket is
-- tens of kilobytes whatever was chosen. This ceiling only bounds what the
-- browser is willing to *read*, and the check exists at all so that a
-- pathological file fails with a sentence rather than by hanging a decode.

update storage.buckets
  set file_size_limit = 5242880 -- 5 MB
  where id = 'avatars';
